"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

/**
 * DocsCodeBlock
 *
 * Syntax-highlighted code block with copy button and language pill. The
 * highlighter is hand-rolled to avoid shipping a 100kb+ dependency. We
 * support three languages: ts/tsx (treated the same), json, and bash. Any
 * other language renders as plain text with the language pill intact.
 */

export type CodeLanguage = "ts" | "json" | "bash" | "text" | "http";

export interface DocsCodeBlockProps {
  language: CodeLanguage;
  code: string;
  filename?: string;
  lineNumbers?: boolean;
}

// ── Token classes (mapped to CSS in globals via class selectors) ─────────────

const TOKEN_CLASS = {
  keyword: "text-[#9333EA]",
  string: "text-[#16A34A]",
  number: "text-[#0EA5E9]",
  comment: "text-[#8E8E93] italic",
  prop: "text-[#2563EB]",
  punct: "text-[#3C3C43]",
  builtin: "text-[#D97706]",
  shell: "text-[#9333EA]",
  flag: "text-[#0EA5E9]",
  url: "text-[#059669]",
  plain: "text-[#111]",
} as const;

type Token = { type: keyof typeof TOKEN_CLASS; value: string };

// ── Lexers ──────────────────────────────────────────────────────────────────

const TS_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "do", "switch", "case", "break", "continue", "new", "class", "extends",
  "import", "from", "export", "default", "async", "await", "try", "catch",
  "finally", "throw", "typeof", "instanceof", "in", "of", "true", "false",
  "null", "undefined", "this", "super", "void", "as", "interface", "type",
  "enum", "namespace", "public", "private", "protected", "static", "readonly",
  "implements", "yield",
]);

function lexTs(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const c = input[i];
    // Line comment
    if (c === "/" && input[i + 1] === "/") {
      let j = i + 2;
      while (j < n && input[j] !== "\n") j++;
      tokens.push({ type: "comment", value: input.slice(i, j) });
      i = j;
      continue;
    }
    // Block comment
    if (c === "/" && input[i + 1] === "*") {
      let j = i + 2;
      while (j < n && !(input[j] === "*" && input[j + 1] === "/")) j++;
      j = Math.min(n, j + 2);
      tokens.push({ type: "comment", value: input.slice(i, j) });
      i = j;
      continue;
    }
    // String
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let j = i + 1;
      while (j < n && input[j] !== quote) {
        if (input[j] === "\\" && j + 1 < n) j += 2;
        else j++;
      }
      j = Math.min(n, j + 1);
      tokens.push({ type: "string", value: input.slice(i, j) });
      i = j;
      continue;
    }
    // Number
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < n && /[0-9.]/.test(input[j])) j++;
      tokens.push({ type: "number", value: input.slice(i, j) });
      i = j;
      continue;
    }
    // Identifier / keyword
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(input[j])) j++;
      const word = input.slice(i, j);
      if (TS_KEYWORDS.has(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (input[j] === "(") {
        tokens.push({ type: "prop", value: word });
      } else {
        tokens.push({ type: "plain", value: word });
      }
      i = j;
      continue;
    }
    // Punctuation
    if (/[{}()[\];,.:?<>=+\-*/&|!%^~]/.test(c)) {
      tokens.push({ type: "punct", value: c });
      i++;
      continue;
    }
    // Default: emit one char as plain
    tokens.push({ type: "plain", value: c });
    i++;
  }
  return tokens;
}

function lexJson(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const c = input[i];
    if (c === '"') {
      let j = i + 1;
      while (j < n && input[j] !== '"') {
        if (input[j] === "\\" && j + 1 < n) j += 2;
        else j++;
      }
      j = Math.min(n, j + 1);
      // Decide if this is a property key (followed by colon, possibly whitespace)
      let k = j;
      while (k < n && /\s/.test(input[k])) k++;
      const isKey = input[k] === ":";
      tokens.push({
        type: isKey ? "prop" : "string",
        value: input.slice(i, j),
      });
      i = j;
      continue;
    }
    if (/[0-9-]/.test(c)) {
      let j = i + 1;
      while (j < n && /[0-9.eE+-]/.test(input[j])) j++;
      tokens.push({ type: "number", value: input.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-z]/.test(c)) {
      let j = i + 1;
      while (j < n && /[a-z]/.test(input[j])) j++;
      const word = input.slice(i, j);
      if (word === "true" || word === "false" || word === "null") {
        tokens.push({ type: "keyword", value: word });
      } else {
        tokens.push({ type: "plain", value: word });
      }
      i = j;
      continue;
    }
    if (/[{}[\]:,]/.test(c)) {
      tokens.push({ type: "punct", value: c });
      i++;
      continue;
    }
    tokens.push({ type: "plain", value: c });
    i++;
  }
  return tokens;
}

const BASH_BUILTINS = new Set([
  "cd", "ls", "pwd", "echo", "cat", "grep", "sed", "awk", "curl", "wget",
  "git", "npm", "npx", "yarn", "pnpm", "pip", "python", "node", "docker",
  "kubectl", "ssh", "scp", "rm", "mv", "cp", "mkdir", "touch", "export",
  "source", "sudo", "chmod", "chown", "tar", "find", "head", "tail",
  "pipes",
]);

function lexBash(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;
  let atLineStart = true;
  while (i < n) {
    const c = input[i];
    if (c === "\n") {
      tokens.push({ type: "plain", value: c });
      i++;
      atLineStart = true;
      continue;
    }
    if (/\s/.test(c)) {
      tokens.push({ type: "plain", value: c });
      i++;
      continue;
    }
    // Comment
    if (c === "#") {
      let j = i + 1;
      while (j < n && input[j] !== "\n") j++;
      tokens.push({ type: "comment", value: input.slice(i, j) });
      i = j;
      atLineStart = false;
      continue;
    }
    // String
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < n && input[j] !== quote) {
        if (input[j] === "\\" && j + 1 < n) j += 2;
        else j++;
      }
      j = Math.min(n, j + 1);
      tokens.push({ type: "string", value: input.slice(i, j) });
      i = j;
      atLineStart = false;
      continue;
    }
    // Flag (--foo, -f)
    if (c === "-" && /[-A-Za-z]/.test(input[i + 1] ?? "")) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9-]/.test(input[j])) j++;
      tokens.push({ type: "flag", value: input.slice(i, j) });
      i = j;
      atLineStart = false;
      continue;
    }
    // Word
    if (/[A-Za-z_/]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_./-]/.test(input[j])) j++;
      const word = input.slice(i, j);
      if (/^https?:\/\//.test(word)) {
        tokens.push({ type: "url", value: word });
      } else if (atLineStart && BASH_BUILTINS.has(word.split("/").pop() ?? "")) {
        tokens.push({ type: "shell", value: word });
      } else if (atLineStart) {
        tokens.push({ type: "shell", value: word });
      } else {
        tokens.push({ type: "plain", value: word });
      }
      i = j;
      atLineStart = false;
      continue;
    }
    // Punctuation
    if (/[|&;<>=$()\\{}[\],.:?+*]/.test(c)) {
      tokens.push({ type: "punct", value: c });
      i++;
      atLineStart = false;
      continue;
    }
    tokens.push({ type: "plain", value: c });
    i++;
    atLineStart = false;
  }
  return tokens;
}

function lexHttp(input: string): Token[] {
  // Treat HTTP-style snippets as bash-ish, except the first line is highlighted
  // as a method-and-path. Simple heuristic: highlight HTTP methods, header
  // names (before ":"), and bearer strings.
  const tokens: Token[] = [];
  const lines = input.split("\n");
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const methodMatch = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)/.exec(
      line,
    );
    if (methodMatch) {
      tokens.push({ type: "keyword", value: methodMatch[1] });
      tokens.push({ type: "plain", value: " " });
      tokens.push({ type: "url", value: methodMatch[2] });
      tokens.push({
        type: "plain",
        value: line.slice(methodMatch[0].length),
      });
    } else if (/^[A-Z][A-Za-z0-9-]+:/.test(line)) {
      const colon = line.indexOf(":");
      tokens.push({ type: "prop", value: line.slice(0, colon) });
      tokens.push({ type: "punct", value: ":" });
      tokens.push({ type: "plain", value: line.slice(colon + 1) });
    } else if (line.trim().length === 0) {
      tokens.push({ type: "plain", value: line });
    } else {
      // Body — try JSON lex; if it has braces, parse, else plain
      if (/[{}[\]"]/.test(line)) {
        for (const t of lexJson(line)) tokens.push(t);
      } else {
        tokens.push({ type: "plain", value: line });
      }
    }
    if (lineIdx < lines.length - 1) {
      tokens.push({ type: "plain", value: "\n" });
    }
  }
  return tokens;
}

function lex(language: CodeLanguage, code: string): Token[] {
  switch (language) {
    case "ts":
      return lexTs(code);
    case "json":
      return lexJson(code);
    case "bash":
      return lexBash(code);
    case "http":
      return lexHttp(code);
    case "text":
    default:
      return [{ type: "plain", value: code }];
  }
}

// ── Render ──────────────────────────────────────────────────────────────────

function renderTokens(tokens: ReadonlyArray<Token>): ReactNode[] {
  return tokens.map((tok, idx) => (
    <span key={idx} className={TOKEN_CLASS[tok.type]}>
      {tok.value}
    </span>
  ));
}

const LANG_LABEL: Record<CodeLanguage, string> = {
  ts: "ts",
  json: "json",
  bash: "bash",
  http: "http",
  text: "text",
};

export function DocsCodeBlock({
  language,
  code,
  filename,
  lineNumbers = false,
}: DocsCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function onCopy(): void {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  }

  const tokens = lex(language, code);
  const lines = code.split("\n");
  const langLabel = LANG_LABEL[language];

  return (
    <div className="relative group/code my-5 rounded-2xl border border-black/[0.06] bg-[#FAFAFA] overflow-hidden">
      {(filename || langLabel) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-black/[0.06] bg-white">
          <span className="t-caption text-[#3C3C43] t-mono">
            {filename ?? ""}
          </span>
          <span className="t-caption text-[#8E8E93] rounded-md bg-black/[0.04] px-2 py-0.5 uppercase tracking-wide">
            {langLabel}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-7 h-7 rounded-md bg-white border border-black/[0.06] text-[#3C3C43] opacity-0 group-hover/code:opacity-100 focus-visible:opacity-100 hover:bg-black/[0.04] transition-opacity"
        style={{ top: filename || langLabel ? "44px" : "8px" }}
      >
        {copied ? (
          <Check size={12} aria-hidden="true" />
        ) : (
          <Copy size={12} aria-hidden="true" />
        )}
        <span className="sr-only">{copied ? "Copied" : "Copy code"}</span>
      </button>
      <pre
        className="overflow-x-auto p-4 t-mono text-[13px] leading-[1.6] text-[#111]"
        aria-label={`${langLabel} code sample`}
      >
        {lineNumbers ? (
          <code>
            {lines.map((_lineText, lineIdx) => {
              const lineTokens = sliceTokensForLine(tokens, lineIdx);
              return (
                <span
                  key={lineIdx}
                  className="grid grid-cols-[2ch_1fr] gap-3"
                >
                  <span
                    className="text-[#C7C7CC] select-none text-right"
                    aria-hidden="true"
                  >
                    {lineIdx + 1}
                  </span>
                  <span>{renderTokens(lineTokens)}</span>
                </span>
              );
            })}
          </code>
        ) : (
          <code>{renderTokens(tokens)}</code>
        )}
      </pre>
    </div>
  );
}

// Used only by line-numbered rendering: split flat tokens by newline so we can
// place each line in its own grid row.
function sliceTokensForLine(
  tokens: ReadonlyArray<Token>,
  targetLine: number,
): Token[] {
  let line = 0;
  const out: Token[] = [];
  for (const tok of tokens) {
    if (!tok.value.includes("\n")) {
      if (line === targetLine) out.push(tok);
      continue;
    }
    // Split this token across lines
    const parts = tok.value.split("\n");
    for (let p = 0; p < parts.length; p++) {
      if (line === targetLine && parts[p].length > 0) {
        out.push({ type: tok.type, value: parts[p] });
      }
      if (p < parts.length - 1) {
        line++;
        if (line > targetLine) break;
      }
    }
    if (line > targetLine) break;
  }
  return out;
}
