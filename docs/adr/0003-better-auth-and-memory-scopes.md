# ADR 0003: Better Auth for sign-in; private and team memory with Supermemory recall

Status: accepted, built.

## Context

ADR 0002 built Pipes' own sessions, two-step sign-in and lockout. The team
asked to standardise sign-in on Better Auth, and to give agents memory that
keeps each person's data to themselves while sharing team memory inside a
workspace, with Supermemory and "the Cloudflare stack".

## Decision

**Sign-in.** Better Auth runs in the Next server with one configuration for
every mode. In production its tables are Better Auth's Convex component,
reached through a bridge that needs Pipes' server key. Rejected: running
Better Auth inside Convex (the documented route), because it splits sign-in
across two runtimes, rules out the SSO plugin and cookie options Pipes needs,
and its benefit (browser-to-Convex auth) is unused here. Pipes keeps what
Better Auth lacks as hooks: account lockout, single-use codes, hashed recovery
codes, a code to turn two-step off, the journal, workspace idle limits, the
7-day cap and policy. Workspaces and roles stay in Pipes' tables; the
organization plugin would mean re-keying about 30 tables.

**Memory.** Three scopes: private (one person in one workspace), team and
workflow, decided on the server from the signed-in identity. Pipes' records
are the source of truth; Supermemory is an index for search by meaning. Every
hit is joined back to what the caller may see before it is returned.
Supermemory's engine cannot be self-hosted on Workers, so "the Cloudflare
stack" is the hosted API (on Cloudflare) through an optional Pipes Worker that
holds the key, checks signatures and namespaces, and audits to D1.

## Consequences

- Pipes depends on `@convex-dev/better-auth` outside its documented path, so
  versions are pinned exactly and the bridge has unit tests and a browser run
  against a local Convex backend.
- Everyone signs in once more after the move; the migration keeps passwords,
  two-step secrets and recovery codes.
- Better Auth 1.7 needs zod 4 and newer vitest and Convex; all three were
  upgraded with no code changes.
- No role can read another person's private memory. Admins cannot audit its
  contents, only that it exists in the audit log of erasures.
