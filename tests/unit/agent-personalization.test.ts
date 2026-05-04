import { describe, expect, it } from "vitest";
import {
  buildPersonalizationPayload,
  deriveFirstName,
  mergeFeedbackIntoPrior,
  summarizePriorSystems,
  type PersonalizationPayload
} from "@/lib/agent/personalization";
import type { AppContext, FeedbackEntryRecord, RepositorySet, SystemRecord } from "@/lib/repositories/contracts";

const ctx: AppContext = {
  userId: "usr_1",
  workspaceId: "wks_1",
  role: "Owner",
  plan: "Pro",
  actorType: "user",
  actorId: "usr_1"
};

function makeSystem(id: string, name: string, updatedAt: string, archived = false): SystemRecord {
  return {
    id,
    workspaceId: "wks_1",
    name,
    description: "",
    createdBy: "usr_1",
    createdAt: updatedAt,
    updatedAt,
    archivedAt: archived ? updatedAt : undefined
  };
}

function makeRepos(
  systems: SystemRecord[],
  bundleNodes = 0,
  bundlePipes = 0,
  feedback: FeedbackEntryRecord[] = []
): RepositorySet {
  // We only need the systems and feedback repos for personalization. The
  // other entries get cast as never so we can build a stand-in.
  return {
    systems: {
      list: async () => systems,
      create: async () => "",
      getBundle: async (systemId: string) => ({
        system: systems.find((s) => s.id === systemId) ?? systems[0],
        nodes: Array.from({ length: bundleNodes }, (_, i) => ({ id: `n_${i}`, systemId, type: "Node", title: `n${i}`, position: { x: 0, y: 0 }, portIds: [] })),
        pipes: Array.from({ length: bundlePipes }, (_, i) => ({ id: `p_${i}`, systemId, fromPortId: "out", toPortId: "in" })),
        comments: [],
        versions: [],
        presence: []
      }),
      archive: async () => undefined,
      restore: async () => undefined
    },
    feedback: {
      listEntries: async () => feedback
    }
  } as unknown as RepositorySet;
}

function thumbsEntry(verdict: "up" | "down", isoOffsetMs: number): FeedbackEntryRecord {
  return {
    id: `fbk_${Math.random().toString(36).slice(2, 10)}`,
    userId: "usr_1",
    kind: "thumbs",
    verdict,
    createdAt: new Date(Date.now() - isoOffsetMs).toISOString()
  };
}

describe("deriveFirstName", () => {
  it("returns the first space-separated token of the user's name", () => {
    expect(deriveFirstName({ name: "Alex Rivera", email: "x@y" })).toBe("Alex");
  });

  it("falls back to the email local-part when name is missing", () => {
    expect(deriveFirstName({ name: "", email: "casey@example.com" })).toBe("casey");
  });

  it("returns empty string when both name and email are absent", () => {
    expect(deriveFirstName({ name: "", email: "" })).toBe("");
    expect(deriveFirstName(null)).toBe("");
    expect(deriveFirstName(undefined)).toBe("");
  });

  it("trims whitespace before parsing", () => {
    expect(deriveFirstName({ name: "   Jordan  Smith ", email: "" })).toBe("Jordan");
  });

  it("ignores email when name has any value", () => {
    expect(deriveFirstName({ name: "Sam", email: "other@x" })).toBe("Sam");
  });
});

describe("summarizePriorSystems", () => {
  it("returns empty when no other systems exist", () => {
    const systems = [makeSystem("a", "Solo", "2026-01-01T00:00:00.000Z")];
    expect(summarizePriorSystems(systems, "a")).toBe("");
  });

  it("lists up to three most recently updated systems excluding the current one", () => {
    const systems = [
      makeSystem("cur", "Current", "2026-04-01T00:00:00.000Z"),
      makeSystem("a", "Alpha", "2026-04-10T00:00:00.000Z"),
      makeSystem("b", "Beta", "2026-04-05T00:00:00.000Z"),
      makeSystem("c", "Gamma", "2026-03-20T00:00:00.000Z"),
      makeSystem("d", "Delta", "2026-02-01T00:00:00.000Z")
    ];
    const summary = summarizePriorSystems(systems, "cur");
    expect(summary).toBe("Has shipped: Alpha, Beta, Gamma");
  });

  it("skips archived systems", () => {
    const systems = [
      makeSystem("cur", "Current", "2026-04-01T00:00:00.000Z"),
      makeSystem("a", "Alpha", "2026-04-10T00:00:00.000Z", true),
      makeSystem("b", "Beta", "2026-04-05T00:00:00.000Z")
    ];
    expect(summarizePriorSystems(systems, "cur")).toBe("Has shipped: Beta");
  });

  it("caps the summary at 80 characters", () => {
    const systems = [
      makeSystem("cur", "Cur", "2026-04-01T00:00:00.000Z"),
      makeSystem("a", "A".repeat(60), "2026-04-10T00:00:00.000Z"),
      makeSystem("b", "B".repeat(60), "2026-04-05T00:00:00.000Z"),
      makeSystem("c", "C".repeat(60), "2026-03-20T00:00:00.000Z")
    ];
    const summary = summarizePriorSystems(systems, "cur");
    expect(summary.length).toBeLessThanOrEqual(80);
  });
});

describe("buildPersonalizationPayload", () => {
  it("populates every field from the available repos and identity", async () => {
    const systems = [
      makeSystem("sys_main", "Customer Onboarding", "2026-04-30T00:00:00.000Z"),
      makeSystem("sys_a", "Billing Pipeline", "2026-04-20T00:00:00.000Z"),
      makeSystem("sys_b", "Support Triage", "2026-04-15T00:00:00.000Z")
    ];
    const repos = makeRepos(systems, 4, 3);
    const payload = await buildPersonalizationPayload(ctx, "sys_main", repos, { name: "Alex Rivera", email: "alex@pipes.local" });
    expect(payload.userFirstName).toBe("Alex");
    expect(payload.systemName).toBe("Customer Onboarding");
    expect(payload.priorSystemsSummary).toBe("Has shipped: Billing Pipeline, Support Triage");
    expect(payload.existingNodesCount).toBe(4);
    expect(payload.existingPipesCount).toBe(3);
    expect(payload.userTeam).toBe("");
  });

  it("returns empty strings + zero counts when the system is unknown", async () => {
    const repos = {
      systems: {
        list: async () => [] as SystemRecord[],
        create: async () => "",
        getBundle: async () => { throw new Error("not found"); },
        archive: async () => undefined,
        restore: async () => undefined
      }
    } as unknown as RepositorySet;
    const payload = await buildPersonalizationPayload(ctx, "sys_missing", repos, null);
    expect(payload.systemName).toBe("");
    expect(payload.priorSystemsSummary).toBe("");
    expect(payload.existingNodesCount).toBe(0);
    expect(payload.existingPipesCount).toBe(0);
    expect(payload.userFirstName).toBe("");
  });

  it("survives a failing systems.list call without throwing", async () => {
    const repos = {
      systems: {
        list: async () => { throw new Error("boom"); },
        create: async () => "",
        getBundle: async () => { throw new Error("boom"); },
        archive: async () => undefined,
        restore: async () => undefined
      }
    } as unknown as RepositorySet;
    const payload = await buildPersonalizationPayload(ctx, "sys_x", repos, { name: "Sam", email: "" });
    expect(payload.userFirstName).toBe("Sam");
    expect(payload.systemName).toBe("");
    expect(payload.priorSystemsSummary).toBe("");
    expect(payload.existingNodesCount).toBe(0);
  });

  it("excludes the current system from the prior systems summary", async () => {
    const systems = [
      makeSystem("sys_main", "Main", "2026-04-30T00:00:00.000Z"),
      makeSystem("sys_a", "Alpha", "2026-04-25T00:00:00.000Z")
    ];
    const repos = makeRepos(systems);
    const payload = await buildPersonalizationPayload(ctx, "sys_main", repos, { name: "Alex", email: "" });
    expect(payload.priorSystemsSummary).toBe("Has shipped: Alpha");
    expect(payload.priorSystemsSummary).not.toContain("Main");
  });

  it("emits empty userTeam by default (workspace name not yet exposed)", async () => {
    const repos = makeRepos([makeSystem("sys", "X", "2026-04-01T00:00:00.000Z")]);
    const payload = await buildPersonalizationPayload(ctx, "sys", repos, { name: "Alex", email: "" });
    expect(payload.userTeam).toBe("");
  });

  it("populates feedbackHint from the user's last 7 days of feedback", async () => {
    const systems = [makeSystem("sys", "X", "2026-04-01T00:00:00.000Z")];
    const oneDay = 24 * 60 * 60 * 1000;
    const repos = makeRepos(systems, 0, 0, [
      thumbsEntry("up", oneDay),
      thumbsEntry("up", 2 * oneDay),
      thumbsEntry("down", 3 * oneDay)
    ]);
    const payload = await buildPersonalizationPayload(ctx, "sys", repos, { name: "Alex", email: "" });
    expect(payload.feedbackHint).toBe("Last 7d: 2 up, 1 down.");
  });

  it("returns empty feedbackHint when no feedback exists", async () => {
    const repos = makeRepos([makeSystem("sys", "X", "2026-04-01T00:00:00.000Z")]);
    const payload = await buildPersonalizationPayload(ctx, "sys", repos, { name: "Alex", email: "" });
    expect(payload.feedbackHint).toBe("");
  });

  it("survives a failing feedback.listEntries call without throwing", async () => {
    const repos = {
      systems: {
        list: async () => [] as SystemRecord[],
        create: async () => "",
        getBundle: async () => { throw new Error("boom"); },
        archive: async () => undefined,
        restore: async () => undefined
      },
      feedback: {
        listEntries: async () => { throw new Error("boom"); }
      }
    } as unknown as RepositorySet;
    const payload = await buildPersonalizationPayload(ctx, "sys_x", repos, { name: "Sam", email: "" });
    expect(payload.feedbackHint).toBe("");
  });
});

describe("mergeFeedbackIntoPrior", () => {
  const base: PersonalizationPayload = {
    userFirstName: "Alex",
    userTeam: "",
    priorSystemsSummary: "Has shipped: Alpha, Beta",
    systemName: "Customer Onboarding",
    existingNodesCount: 4,
    existingPipesCount: 3,
    feedbackHint: ""
  };

  it("returns the same payload when feedbackHint is empty", () => {
    const out = mergeFeedbackIntoPrior(base);
    expect(out.priorSystemsSummary).toBe("Has shipped: Alpha, Beta");
  });

  it("appends feedbackHint to priorSystemsSummary when both are present", () => {
    const out = mergeFeedbackIntoPrior({ ...base, feedbackHint: "Last 7d: 5 up, 1 down." });
    expect(out.priorSystemsSummary).toBe("Has shipped: Alpha, Beta Last 7d: 5 up, 1 down.");
  });

  it("uses feedbackHint alone when priorSystemsSummary is empty", () => {
    const out = mergeFeedbackIntoPrior({
      ...base,
      priorSystemsSummary: "",
      feedbackHint: "Last 7d: 2 up, 0 down."
    });
    expect(out.priorSystemsSummary).toBe("Last 7d: 2 up, 0 down.");
  });

  it("does not mutate the input payload", () => {
    const input: PersonalizationPayload = { ...base, feedbackHint: "Last 7d: 1 up." };
    mergeFeedbackIntoPrior(input);
    expect(input.priorSystemsSummary).toBe("Has shipped: Alpha, Beta");
  });
});
