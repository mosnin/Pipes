import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "subtle";

export function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={cn("btn", variant === "subtle" ? "btn-subtle" : "", className)} {...props}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className="select" {...props}>
      {children}
    </select>
  );
}

export function Badge({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "good" | "warn" }>) {
  return <span className={cn("badge", `badge-${tone}`)}>{children}</span>;
}

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function Panel({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

export function Sidebar({ children }: PropsWithChildren) {
  return <aside className="sidebar" aria-label="Sidebar">{children}</aside>;
}

export function Topbar({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <header className="topbar">
      <div>{left}</div>
      <div>{right}</div>
    </header>
  );
}

export function Tabs({ items }: { items: string[] }) {
  return (
    <div className="tabs">
      {items.map((item) => (
        <button type="button" key={item} className="tab-item">
          {item}
        </button>
      ))}
    </div>
  );
}

export function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="table">
      <thead>
        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>{row.map((cell, cidx) => <td key={`${idx}-${cidx}`}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function AvatarStack({ names }: { names: string[] }) {
  return (
    <div className="avatar-stack">
      {names.map((name) => (
        <span key={name} className="avatar" title={name}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      ))}
    </div>
  );
}

export function CommentBubble({ author, text }: { author: string; text: string }) {
  return (
    <article className="comment-bubble">
      <strong>{author}</strong>
      <p>{text}</p>
    </article>
  );
}

export function NodeTypeBadge({ type }: { type: string }) {
  return <Badge tone="neutral">{type}</Badge>;
}

export function ValidationBadge({ severity }: { severity: "info" | "warning" | "error" }) {
  const tone = severity === "error" ? "warn" : severity === "warning" ? "neutral" : "good";
  return <Badge tone={tone}>{severity}</Badge>;
}
