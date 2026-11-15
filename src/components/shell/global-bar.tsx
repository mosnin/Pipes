"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Mark } from "@/components/brand/logo";
import { Avatar } from "@/components/ledger/author-stamp";
import { ThemeChoice } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CreditCard, LogOut, Search, UserRound } from "@/components/ui/icon";
import { SidebarTrigger } from "@/components/ui/sidebar";

export interface ShellUser {
  name: string;
  email: string;
}

/**
 * THE BAR: the one inverted region, spanning the viewport above rail and pane.
 * 56px of `--bar-fill`, a 640 x 36 search field centred on the viewport, and
 * the account cluster on the right. Lifted from Company OS unchanged in
 * geometry; only the contents are Pipes'.
 */
export function GlobalBar({
  user,
  workspaceLabel,
  plan,
  onOpenSearch
}: {
  user: ShellUser;
  workspaceLabel: string;
  plan: string;
  onOpenSearch: () => void;
}): ReactNode {
  return (
    <header className="app-bar relative z-30 flex h-[var(--header-h)] shrink-0 items-center gap-4 bg-bar px-5 sm:px-6">
      <div className="flex min-w-0 shrink items-center gap-4">
        <SidebarTrigger label="Open navigation" variant="bar" className="lg:hidden" />
        <Link href="/dashboard" className="focus-ring-bar flex shrink-0 items-center gap-3 rounded-8 text-bar-ink outline-none">
          <Mark size={20} />
          <span className="t-brand hidden whitespace-nowrap sm:inline">pipes</span>
        </Link>
        <span className="t-caption-medium hidden h-[24px] min-w-0 items-center gap-2 rounded-6 px-3 text-bar-ink-dim sm:inline-flex">
          <span className="min-w-0 truncate">{workspaceLabel}</span>
          <span className="t-mono-micro shrink-0 uppercase">{plan}</span>
        </span>
      </div>

      <div className="pointer-events-none absolute inset-x-0 hidden justify-center px-5 lg:flex">
        <BarSearch onOpenSearch={onOpenSearch} />
      </div>
      <div className="hidden min-w-0 flex-1 justify-center sm:flex lg:hidden">
        <BarSearch onOpenSearch={onOpenSearch} />
      </div>

      <div className="ms-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="focus-ring-bar flex size-[32px] items-center justify-center rounded-8 text-bar-ink outline-none transition-colors duration-[var(--dur-1)] hover:bg-bar-field sm:hidden"
        >
          <Search className="size-[16px]" strokeWidth={1.75} />
        </button>
        <AccountMenu user={user} />
      </div>
    </header>
  );
}

function BarSearch({ onOpenSearch }: { onOpenSearch: () => void }): ReactNode {
  return (
    <button
      type="button"
      onClick={onOpenSearch}
      className="focus-ring-bar pointer-events-auto flex h-[36px] w-full max-w-[640px] items-center gap-4 rounded-8 bg-bar-field px-4 text-bar-ink-dim outline-none transition-colors duration-[var(--dur-1)] hover:bg-bar-field-hover"
    >
      <Search className="size-[16px] shrink-0" strokeWidth={1.75} />
      <span className="t-body min-w-0 flex-1 truncate text-left">Search</span>
      <span aria-hidden="true" className="t-caption shrink-0">⌘</span>
      <span aria-hidden="true" className="t-caption shrink-0">K</span>
    </button>
  );
}

function AccountMenu({ user }: { user: ShellUser }): ReactNode {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account"
        className="focus-ring-bar flex h-[32px] items-center gap-3 rounded-8 ps-1 pe-3 outline-none transition-colors duration-[var(--dur-1)] hover:bg-bar-field"
      >
        <span className="flex size-[24px] shrink-0 overflow-hidden rounded-full">
          <Avatar label={user.name} kind="human" imageUrl={null} size={24} />
        </span>
        <span className="t-caption-medium hidden max-w-[140px] truncate text-bar-ink lg:inline">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[256px]">
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="flex size-[32px] shrink-0 overflow-hidden rounded-full">
            <Avatar label={user.name} kind="human" imageUrl={null} size={32} />
          </span>
          <div className="flex min-w-0 flex-col">
            <p className="t-body-medium truncate text-ink">{user.name}</p>
            <p className="t-micro truncate text-ink-3">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/collaboration">
            <UserRound />
            Workspace members
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing">
            <CreditCard />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="t-body text-ink-2">Theme</span>
          <ThemeChoice />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive asChild>
          <a href="/api/auth/logout">
            <LogOut />
            Log out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
