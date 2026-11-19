"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import type { RouteSpec, StepSpec } from "@/domain/runs/types";
import type { NodeDefinition } from "@/components/editor/node_definition";
import type { PipeSemantics } from "@/components/editor/pipe_semantics";
import type { Subsystem } from "@/components/editor/structure_model";

/**
 * The system's design document lives on the server (GET/PUT
 * /api/systems/[systemId]/design) so runs, agents and teammates read the same
 * step and route specs the editor writes. This hook owns that document on the
 * client: it loads it once, keeps local state authoritative while you type,
 * and saves the keys you touched with a debounced PUT.
 */

export const LEGACY_NODE_DEFINITIONS_PREFIX = "pipes_node_definitions_v1_";
export const LEGACY_SUBSYSTEMS_PREFIX = "pipes_subsystems_v1_";
export const LEGACY_PIPE_SEMANTICS_PREFIX = "pipes_pipe_semantics_v1_";

const SAVE_DEBOUNCE_MS = 600;
const RETRY_DELAY_MS = 5000;

type DesignKey = "steps" | "routes" | "nodeDefinitions" | "subsystems";

export type DesignDocument = {
  steps: Record<string, StepSpec>;
  routes: Record<string, RouteSpec>;
  nodeDefinitions: Record<string, NodeDefinition>;
  subsystems: Subsystem[];
};

export type DesignSaveStatus = "loading" | "saved" | "pending" | "saving" | "error";

export function semanticsToRoutes(semantics: Record<string, PipeSemantics>): Record<string, RouteSpec> {
  const routes: Record<string, RouteSpec> = {};
  for (const [pipeId, item] of Object.entries(semantics)) {
    if (!item) continue;
    routes[pipeId] = { routeKind: item.routeKind ?? "default", label: item.label, conditionLabel: item.conditionLabel, notes: item.notes };
  }
  return routes;
}

export function routesToSemantics(routes: Record<string, RouteSpec> | undefined): Record<string, PipeSemantics> {
  const semantics: Record<string, PipeSemantics> = {};
  for (const [pipeId, route] of Object.entries(routes ?? {})) {
    if (!route) continue;
    semantics[pipeId] = { pipeId, routeKind: route.routeKind ?? "default", label: route.label, conditionLabel: route.conditionLabel, notes: route.notes };
  }
  return semantics;
}

function isEmptyDocument(doc: Partial<DesignDocument>): boolean {
  return Object.keys(doc.steps ?? {}).length === 0
    && Object.keys(doc.routes ?? {}).length === 0
    && Object.keys(doc.nodeDefinitions ?? {}).length === 0
    && (doc.subsystems ?? []).length === 0;
}

function readLegacy<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function resolve<T>(action: SetStateAction<T>, prev: T): T {
  return typeof action === "function" ? (action as (value: T) => T)(prev) : action;
}

export function useSystemDesign(systemId: string) {
  const [steps, setStepsState] = useState<Record<string, StepSpec>>({});
  const [nodeDefinitions, setNodeDefinitionsState] = useState<Record<string, NodeDefinition>>({});
  const [pipeSemantics, setPipeSemanticsState] = useState<Record<string, PipeSemantics>>({});
  const [subsystems, setSubsystemsState] = useState<Subsystem[]>([]);
  const [status, setStatus] = useState<DesignSaveStatus>("loading");

  // Refs mirror state so the save path always sends the latest values.
  const current = useRef<DesignDocument>({ steps: {}, routes: {}, nodeDefinitions: {}, subsystems: [] });
  const dirty = useRef<Set<DesignKey>>(new Set());
  const loaded = useRef(false);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const migrationKeys = useRef<string[]>([]);
  const semantics = useRef<Record<string, PipeSemantics>>({});
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Timers call through a ref so a scheduled save always runs the latest flush.
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const schedule = useCallback((delay = SAVE_DEBOUNCE_MS) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), delay);
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!loaded.current || dirty.current.size === 0) return;
    if (saving.current) {
      // A save is already on the wire; send again once it lands.
      schedule();
      return;
    }
    const keys = [...dirty.current];
    let failedSave = false;
    const body: Partial<DesignDocument> = {};
    for (const key of keys) (body as Record<string, unknown>)[key] = current.current[key];
    dirty.current = new Set();
    saving.current = true;
    setStatus("saving");
    try {
      const res = await fetch(`/api/systems/${systemId}/design`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.message ?? json.error ?? "save failed");
      if (migrationKeys.current.length) {
        for (const key of migrationKeys.current) {
          try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
        }
        migrationKeys.current = [];
      }
      setStatus(dirty.current.size > 0 ? "pending" : "saved");
    } catch {
      // Put the keys back so the next attempt carries them.
      for (const key of keys) dirty.current.add(key);
      failedSave = true;
      setStatus("error");
    } finally {
      saving.current = false;
    }
    // After a failure, try again on a slower clock; the pill offers a manual retry meanwhile.
    if (dirty.current.size > 0 && !timer.current) schedule(failedSave ? RETRY_DELAY_MS : SAVE_DEBOUNCE_MS);
  }, [schedule, systemId]);

  useEffect(() => { flushRef.current = flush; }, [flush]);

  const markDirty = useCallback((key: DesignKey) => {
    dirty.current.add(key);
    if (!loaded.current) return;
    setStatus((prev) => (prev === "error" ? prev : "pending"));
    schedule();
  }, [schedule]);

  // Load once per system. Keys edited before the load lands keep the local value.
  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    setStatus("loading");
    (async () => {
      let doc: Partial<DesignDocument> | null = null;
      try {
        const res = await fetch(`/api/systems/${systemId}/design`, { cache: "no-store" });
        const json = await res.json();
        if (res.ok && json.ok) doc = json.data as Partial<DesignDocument>;
      } catch {
        doc = null;
      }
      if (cancelled) return;
      if (!doc) {
        // Without the server copy, saving would overwrite it. Stay read-only for the document.
        setStatus("error");
        return;
      }

      const preloadDirty = new Set(dirty.current);
      if (isEmptyDocument(doc) && preloadDirty.size === 0) {
        const defsKey = `${LEGACY_NODE_DEFINITIONS_PREFIX}${systemId}`;
        const semKey = `${LEGACY_PIPE_SEMANTICS_PREFIX}${systemId}`;
        const subKey = `${LEGACY_SUBSYSTEMS_PREFIX}${systemId}`;
        const legacyDefs = readLegacy<Record<string, NodeDefinition>>(defsKey);
        const legacySem = readLegacy<Record<string, PipeSemantics>>(semKey);
        const legacySubs = readLegacy<Subsystem[]>(subKey);
        const found: string[] = [];
        if (legacyDefs && Object.keys(legacyDefs).length) { doc = { ...doc, nodeDefinitions: legacyDefs }; dirty.current.add("nodeDefinitions"); }
        if (legacySem && Object.keys(legacySem).length) { doc = { ...doc, routes: semanticsToRoutes(legacySem) }; dirty.current.add("routes"); }
        if (Array.isArray(legacySubs) && legacySubs.length) { doc = { ...doc, subsystems: legacySubs }; dirty.current.add("subsystems"); }
        for (const key of [defsKey, semKey, subKey]) {
          try { if (localStorage.getItem(key) !== null) found.push(key); } catch { /* storage unavailable */ }
        }
        migrationKeys.current = found;
      }

      const take = <K extends DesignKey>(key: K, value: DesignDocument[K] | undefined) => (preloadDirty.has(key) || value === undefined ? current.current[key] : value);
      current.current.steps = take("steps", doc.steps);
      current.current.routes = take("routes", doc.routes);
      current.current.nodeDefinitions = take("nodeDefinitions", doc.nodeDefinitions);
      current.current.subsystems = take("subsystems", doc.subsystems);
      setStepsState(current.current.steps);
      if (!preloadDirty.has("routes")) { semantics.current = routesToSemantics(current.current.routes); setPipeSemanticsState(semantics.current); }
      setNodeDefinitionsState(current.current.nodeDefinitions);
      setSubsystemsState(current.current.subsystems);
      loaded.current = true;
      if (dirty.current.size > 0) void flush();
      else {
        // An empty server document with stale, empty legacy keys: nothing to upload, just tidy up.
        for (const key of migrationKeys.current) {
          try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
        }
        migrationKeys.current = [];
        setStatus("saved");
      }
    })();
    return () => { cancelled = true; };
  }, [flush, loadAttempt, systemId]);

  // Best-effort save of pending edits when the page goes away.
  useEffect(() => {
    const onHide = () => {
      if (!loaded.current || dirty.current.size === 0) return;
      const body: Partial<DesignDocument> = {};
      for (const key of dirty.current) (body as Record<string, unknown>)[key] = current.current[key];
      void fetch(`/api/systems/${systemId}/design`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      if (timer.current) clearTimeout(timer.current);
      onHide();
    };
  }, [systemId]);

  const setSteps = useCallback((action: SetStateAction<Record<string, StepSpec>>) => {
    const next = resolve(action, current.current.steps);
    current.current.steps = next;
    setStepsState(next);
    markDirty("steps");
  }, [markDirty]);

  const setNodeDefinitions = useCallback((action: SetStateAction<Record<string, NodeDefinition>>) => {
    const next = resolve(action, current.current.nodeDefinitions);
    if (next === current.current.nodeDefinitions) return;
    current.current.nodeDefinitions = next;
    setNodeDefinitionsState(next);
    markDirty("nodeDefinitions");
  }, [markDirty]);

  const setPipeSemantics = useCallback((action: SetStateAction<Record<string, PipeSemantics>>) => {
    const next = resolve(action, semantics.current);
    semantics.current = next;
    current.current.routes = semanticsToRoutes(next);
    setPipeSemanticsState(next);
    markDirty("routes");
  }, [markDirty]);

  const setSubsystems = useCallback((action: SetStateAction<Subsystem[]>) => {
    const next = resolve(action, current.current.subsystems);
    current.current.subsystems = next;
    setSubsystemsState(next);
    markDirty("subsystems");
  }, [markDirty]);

  const updateStep = useCallback((nodeId: string, patch: Partial<StepSpec>) => {
    setSteps((prev) => ({ ...prev, [nodeId]: { ...prev[nodeId], ...patch } }));
  }, [setSteps]);

  const retry = useCallback(() => {
    if (!loaded.current) { setLoadAttempt((n) => n + 1); return; }
    void flush();
  }, [flush]);

  return { steps, setSteps, updateStep, nodeDefinitions, setNodeDefinitions, pipeSemantics, setPipeSemantics, subsystems, setSubsystems, status, retry };
}
