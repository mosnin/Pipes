"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";

/**
 * ProtocolCodeTabs
 *
 * Tabbed code block showing the same example in four languages. Hand-rolled
 * syntax highlighting via regex tokenizers. Each tab has its own Copy button.
 *
 * The tabs are intentionally locked at four: TypeScript, Python, cURL,
 * Claude Desktop config. Same shape every time; callers cannot reorder.
 */

export type ProtocolCodeLanguage =
  | "typescript"
  | "python"
  | "bash"
  | "json";

export interface ProtocolCodeSample {
  id: ProtocolCodeLanguage;
  label: string;
  code: string;
}

export interface ProtocolCodeTabsProps {
  samples: ReadonlyArray<ProtocolCodeSample>;
  /** Optional caption rendered above the code area. */
  caption?: string;
  /** Optional className for the outer wrapper. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokenKind =
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "punct"
  | "ident"
  | "property"
  | "method"
  | "url"
  | "flag"
  | "plain";

interface Token {
  kind: TokenKind;
  value: string;
}

const KEYWORDS_TS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "await",
  "async",
  "import",
  "from",
  "export",
  "if",
  "else",
  "for",
  "while",
  "true",
  "false",
  "null",
  "undefined",
  "new",
  "throw",
  "try",
  "catch",
  "type",
  "interface",
  "as",
]);

const KEYWORDS_PY = new Set([
  "import",
  "from",
  "def",
  "return",
  "if",
  "else",
  "elif",
  "for",
  "while",
  "True",
  "False",
  "None",
  "as",
  "in",
  "not",
  "is",
  "and",
  "or",
  "class",
  "with",
  "lambda",
]);

const TOKEN_COLOR: Record<TokenKind, string> = {
  keyword: "#C792EA",
  string: "#A8E060",
  number: "#F78C6C",
  comment: "#6C7280",
  punct: "#C7C7CC",
  ident: "#E6E6E9",
  property: "#82AAFF",
  method: "#F0B86A",
  url: "#A8E060",
  flag: "#F0B86A",
  plain: "#E6E6E9",
};

function tokenizeTs(code: string): Token[] {
  const tokens: Token[] = [];
  const re = /\/\/.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_$][\w$]*\b|[{}[\]().,;:]|[+\-*/=<>!?]+|\s+/gm;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) tokens.push({ kind: "plain", value: code.slice(last, m.index) });
    const v = m[0];
    if (v.startsWith("//") || v.startsWith("/*")) tokens.push({ kind: "comment", value: v });
    else if (v.startsWith('"') || v.startsWith("'") || v.startsWith("`")) tokens.push({ kind: "string", value: v });
    else if (/^\d/.test(v)) tokens.push({ kind: "number", value: v });
    else if (KEYWORDS_TS.has(v)) tokens.push({ kind: "keyword", value: v });
    else if (/^[a-zA-Z_$][\w$]*$/.test(v)) {
      const next = code[re.lastIndex];
      if (next === "(") tokens.push({ kind: "method", value: v });
      else tokens.push({ kind: "ident", value: v });
    } else if (/^[{}[\]().,;:]+$/.test(v)) tokens.push({ kind: "punct", value: v });
    else if (/^\s+$/.test(v)) tokens.push({ kind: "plain", value: v });
    else tokens.push({ kind: "plain", value: v });
    last = re.lastIndex;
  }
  if (last < code.length) tokens.push({ kind: "plain", value: code.slice(last) });
  return tokens;
}

function tokenizePy(code: string): Token[] {
  const tokens: Token[] = [];
  const re = /#.*$|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_][\w]*\b|[{}[\]().,;:]|[+\-*/=<>!]+|\s+/gm;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) tokens.push({ kind: "plain", value: code.slice(last, m.index) });
    const v = m[0];
    if (v.startsWith("#")) tokens.push({ kind: "comment", value: v });
    else if (v.startsWith('"') || v.startsWith("'")) tokens.push({ kind: "string", value: v });
    else if (/^\d/.test(v)) tokens.push({ kind: "number", value: v });
    else if (KEYWORDS_PY.has(v)) tokens.push({ kind: "keyword", value: v });
    else if (/^[a-zA-Z_][\w]*$/.test(v)) {
      const next = code[re.lastIndex];
      if (next === "(") tokens.push({ kind: "method", value: v });
      else tokens.push({ kind: "ident", value: v });
    } else if (/^[{}[\]().,;:]+$/.test(v)) tokens.push({ kind: "punct", value: v });
    else tokens.push({ kind: "plain", value: v });
    last = re.lastIndex;
  }
  if (last < code.length) tokens.push({ kind: "plain", value: code.slice(last) });
  return tokens;
}

function tokenizeBash(code: string): Token[] {
  const tokens: Token[] = [];
  // line-by-line so comments work
  const re = /#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\bhttps?:\/\/\S+|\B-{1,2}[A-Za-z][\w-]*\b|\b[A-Za-z_][\w]*\b|\s+|[^\sA-Za-z0-9_]+/gm;
  let m: RegExpExecArray | null;
  let last = 0;
  let firstToken = true;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) tokens.push({ kind: "plain", value: code.slice(last, m.index) });
    const v = m[0];
    if (v.startsWith("#")) tokens.push({ kind: "comment", value: v });
    else if (v.startsWith('"') || v.startsWith("'")) tokens.push({ kind: "string", value: v });
    else if (/^https?:\/\//.test(v)) tokens.push({ kind: "url", value: v });
    else if (/^-{1,2}[A-Za-z]/.test(v)) tokens.push({ kind: "flag", value: v });
    else if (firstToken && /^[A-Za-z_][\w]*$/.test(v)) tokens.push({ kind: "method", value: v });
    else if (/^[A-Za-z_][\w]*$/.test(v)) tokens.push({ kind: "ident", value: v });
    else tokens.push({ kind: "plain", value: v });
    if (/\S/.test(v)) firstToken = v.endsWith("\\");
    if (v.includes("\n")) firstToken = true;
    last = re.lastIndex;
  }
  if (last < code.length) tokens.push({ kind: "plain", value: code.slice(last) });
  return tokens;
}

function tokenizeJson(code: string): Token[] {
  const tokens: Token[] = [];
  const re = /"(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|\b-?\d+(?:\.\d+)?\b|\btrue\b|\bfalse\b|\bnull\b|[{}[\]:,]|\s+/gm;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) tokens.push({ kind: "plain", value: code.slice(last, m.index) });
    const v = m[0];
    if (/^".*":\s*$/.test(v)) {
      const colonIdx = v.lastIndexOf(":");
      tokens.push({ kind: "property", value: v.slice(0, colonIdx) });
      tokens.push({ kind: "punct", value: v.slice(colonIdx) });
    } else if (v.startsWith('"')) tokens.push({ kind: "string", value: v });
    else if (/^-?\d/.test(v)) tokens.push({ kind: "number", value: v });
    else if (v === "true" || v === "false" || v === "null") tokens.push({ kind: "keyword", value: v });
    else if (/^[{}[\]:,]$/.test(v)) tokens.push({ kind: "punct", value: v });
    else tokens.push({ kind: "plain", value: v });
    last = re.lastIndex;
  }
  if (last < code.length) tokens.push({ kind: "plain", value: code.slice(last) });
  return tokens;
}

function tokenize(lang: ProtocolCodeLanguage, code: string): Token[] {
  if (lang === "typescript") return tokenizeTs(code);
  if (lang === "python") return tokenizePy(code);
  if (lang === "bash") return tokenizeBash(code);
  return tokenizeJson(code);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function HighlightedCode({
  lang,
  code,
}: {
  lang: ProtocolCodeLanguage;
  code: string;
}): ReactNode {
  const tokens = useMemo(() => tokenize(lang, code), [lang, code]);
  return (
    <code
      className="t-mono block whitespace-pre"
      style={{ fontSize: 12.5, lineHeight: 1.65 }}
      data-testid="protocol-code-highlighted"
    >
      {tokens.map((t, i) => (
        <span key={i} style={{ color: TOKEN_COLOR[t.kind] }}>
          {t.value}
        </span>
      ))}
    </code>
  );
}

export function ProtocolCodeTabs({
  samples,
  caption,
  className,
}: ProtocolCodeTabsProps) {
  const [active, setActive] = useState<ProtocolCodeLanguage>(samples[0]?.id ?? "typescript");
  const [copied, setCopied] = useState(false);
  const reduced = useReducedMotion();

  const current = samples.find((s) => s.id === active) ?? samples[0];

  const onCopy = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(current.code).catch(() => undefined);
    }
    setCopied(true);
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [current.code]);

  return (
    <div
      className={["rounded-[20px] border border-black/[0.08] overflow-hidden bg-[#0F1115]", className ?? ""].join(" ")}
      data-testid="protocol-code-tabs"
    >
      <div
        className="flex items-center justify-between border-b border-white/[0.08] bg-[#16181D] px-2"
        role="tablist"
        aria-label="Code samples"
      >
        <div className="flex items-center">
          {samples.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`protocol-tab-panel-${s.id}`}
                id={`protocol-tab-${s.id}`}
                data-testid={`protocol-tab-${s.id}`}
                onClick={() => setActive(s.id)}
                className={[
                  "relative t-label font-medium px-3.5 py-2.5 transition-colors",
                  isActive ? "text-white" : "text-white/55 hover:text-white/85",
                ].join(" ")}
              >
                {s.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-[2px] bg-indigo-400 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          data-testid="protocol-code-copy"
          className={[
            "mr-1.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md",
            "t-caption font-medium border transition-colors",
            copied
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08]",
          ].join(" ")}
        >
          {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {caption != null && (
        <div className="px-4 pt-3 t-caption text-white/55">{caption}</div>
      )}

      <div className="relative px-4 py-4 overflow-x-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            id={`protocol-tab-panel-${current.id}`}
            role="tabpanel"
            aria-labelledby={`protocol-tab-${current.id}`}
            data-testid={`protocol-code-panel-${current.id}`}
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <HighlightedCode lang={current.id} code={current.code} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
