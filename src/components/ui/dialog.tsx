"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { TriangleAlert, X } from "@/components/ui/icon";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { IconButton, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * LEDGER INSTRUMENT — Dialog, and the destructive confirmation (§9.32).
 *
 * A dialog is a transient layer (§5.6.2): `--surface-overlay`, `--elev-3`, on a
 * `--surface-scrim` with a 2px blur — a scrim, not frosted glass. It is the only
 * place `--elev-3` appears, and `--elev-3` never sits on another elevated
 * surface (§5.7).
 *
 * ConfirmDialog is the one element in the entire product permitted a solid
 * critical fill (§4.6.12), and it is the component every destructive action in
 * CompanyOS routes through: revoke key, abandon branch, remove member, delete
 * webhook, delete row, discard document, whole-document AI overwrite.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

/**
 * Two widths, measured — see `docs/SHOPIFY_MEASUREMENTS.md`. The reference
 * ships a small modal at 620 and a large one at 880, and nothing between.
 * Both centre at 755.6 @1512, which is also where the top bar's search field
 * centres: two unrelated elements on different screens landing on one axis is
 * the check that the reading is right.
 *
 * Three names survive because callers use them, but `confirm` and `form` are
 * the same box; the reference does not narrow a modal because it is a
 * confirmation.
 */
const DIALOG_WIDTH = {
  confirm: "max-w-[620px]",
  form: "max-w-[620px]",
  review: "max-w-[880px]",
} as const;

export function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>): ReactNode {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        // z 200 on the §5.9 ladder — under the panel at 210, over everything else.
        "fixed inset-0 z-[200] bg-scrim backdrop-blur-[2px]",
        // §7.3: the scrim is a linear opacity ramp over `--dur-3`; it does not
        // scale or move, because it is not an object.
        "duration-[var(--dur-3)] ease-linear",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        "data-[state=closed]:duration-[160ms]",
        className,
      )}
      {...props}
    />
  );
}

export type DialogContentProps = ComponentProps<
  typeof DialogPrimitive.Content
> & {
  size?: "confirm" | "form" | "review";
  /** The 28px close ×. Turn it off when the panel already owns an explicit dismissal. */
  showClose?: boolean;
};

export function DialogContent({
  className,
  size = "form",
  showClose = true,
  children,
  ...props
}: DialogContentProps): ReactNode {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-[210] flex w-full flex-col gap-3",
          // Centring uses the standalone `translate` property, so the enter
          // animation's `transform` composes with it instead of fighting it.
          "-translate-x-1/2 -translate-y-1/2",
          // The radius is carried on a custom property so the whole responsive
          // pair collapses into ONE border-radius utility: a caller passing
          // `rounded-0` for an edge-anchored panel then wins at every width
          // instead of only above the breakpoint.
          "[--dlg-r:20px] rounded-[var(--dlg-r)]",
          "bg-card p-0 shadow-modal outline-none",
          // The reference insets a modal's header, body and footer by 16 —
          // measured at x=588 against a left edge of 567, on both the title
          // row and a body label. The panel itself carries no padding, so a
          // header band and a footer reach the panel's edges without having
          // to bleed back out through it.
          "[--dialog-gutter:24px] gap-0",
          DIALOG_WIDTH[size],
          // §7.3: scale(0.97)→1 + translateY(8px)→0 over `--dur-4`
          // `--ease-emphasis`; exit 160ms, opacity and scale only.
          "duration-[var(--dur-4)] ease-[var(--ease-emphasis)]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          "data-[state=open]:zoom-in-97 data-[state=open]:slide-in-from-bottom-[8px]",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-97",
          "data-[state=closed]:duration-[160ms] data-[state=closed]:ease-[var(--ease-in)]",
          // A title and its subline can be passed as bare children rather than
          // wrapped in DialogHeader, and three callers do. The panel no longer
          // carries padding, so they take the gutter themselves — call sites
          // stay as they are rather than each growing a wrapper.
          "[&>[data-slot=dialog-title]]:px-[var(--dialog-gutter,0px)]",
          "[&>[data-slot=dialog-title]]:pt-[var(--dialog-gutter,0px)]",
          "[&>[data-slot=dialog-title]]:pe-16",
          "[&>[data-slot=dialog-description]]:px-[var(--dialog-gutter,0px)]",
          "[&>[data-slot=dialog-title]+[data-slot=dialog-description]]:mt-1.5",
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close asChild>
            <IconButton
              label="Close"
              size="sm"
              className="absolute end-1.5 top-1"
            >
              <X aria-hidden="true" />
            </IconButton>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Title block: the heading, its subline, and room for the close ×. */
export function DialogHeader({
  className,
  ...props
}: ComponentProps<"div">): ReactNode {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        // 52 including its rule: the band fills y 444..507 and the rule sits at
        // 508..509, measured on `modal-adjust-store-credit` at x=1200.
        // Podium: no band, no rule. The title sits in the card's own padding.
        "flex shrink-0 flex-col justify-center gap-1 rounded-t-[inherit]",
        "px-[var(--dialog-gutter,0px)] pb-3 pt-5 pe-16",
        className,
      )}
      {...props}
    />
  );
}

export type DialogTitleProps = ComponentProps<typeof DialogPrimitive.Title> & {
  /** §9.32: `title-3` for a dialog, `title-1` for a destructive confirmation. */
  size?: "title-3" | "title-1";
};

export function DialogTitle({
  className,
  size = "title-3",
  ...props
}: DialogTitleProps): ReactNode {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      // Chosen rather than layered: two `t-*` role classes on one element would
      // resolve by source order in globals.css, not by intent.
      className={cn(
        size === "title-1" ? "text-[22px] font-semibold leading-[28px] tracking-[-0.02em]" : "text-[17px] font-medium leading-[22px] tracking-[-0.01em]",
        "text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>): ReactNode {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("t-caption text-ink-3", className)}
      {...props}
    />
  );
}

/**
 * The scrolling region. §9.32 puts a hairline under the header *only* when the
 * body scrolls; the border is always present and only changes colour, so the
 * panel never reflows by a pixel when the rule appears. The trigger is an
 * IntersectionObserver sentinel, not a scroll listener (§7.3).
 */
export function DialogBody({
  className,
  children,
  ...props
}: ComponentProps<"div">): ReactNode {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = bodyRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => setScrolled(entry ? !entry.isIntersecting : false),
      { root, threshold: 1 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={bodyRef}
      data-scrolled={scrolled || undefined}
      className={cn(
        "max-h-[60vh] overflow-y-auto",
        "px-[var(--dialog-gutter,0px)] py-2",
        // The header already draws a rule, so the body's own scroll rule would
        // double it. It stays for a body used without a header.
        "border-t border-transparent transition-colors duration-[120ms] ease-linear",
        "data-[scrolled]:border-hairline [[data-slot=dialog-header]+&]:border-transparent",
        className,
      )}
      {...props}
    >
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      {children}
    </div>
  );
}

/**
 * Ghost Cancel then the primary action, right-aligned.
 *
 * It used to draw an inset ground and a hairline top rule. The reference draws
 * neither: scanning `modal-adjust-store-credit` down x=1200 from the body into
 * the footer stays white to the modal's bottom edge at y=832, with no rule and
 * no change of fill. The band was ours, not Shopify's.
 */
export function DialogFooter({
  className,
  ...props
}: ComponentProps<"div">): ReactNode {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-end gap-2 rounded-b-[inherit]",
        "px-[var(--dialog-gutter,0px)] pb-5 pt-2",
        className,
      )}
      {...props}
    />
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  /** State the irreversible consequence in domain terms, not "are you sure?". */
  description?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  /**
   * Type-to-confirm. §9.32 requires it when the target is a branch, a key or a
   * member; the confirm stays disabled until this exact string is typed.
   */
  confirmPhrase?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  confirmPhrase,
  cancelLabel = "Cancel",
}: ConfirmDialogProps): ReactNode {
  const contentRef = useRef<HTMLDivElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        size="confirm"
        // The footer already carries an explicit Cancel; a second dismissal in
        // the corner is two affordances to one destination.
        showClose={false}
        onOpenAutoFocus={(event) => {
          // §9.32 / §12.3: initial focus lands on Cancel, never on the
          // destructive confirm. A trapped dialog that opens with Enter armed
          // over "Delete" is a data-loss bug wearing a confirmation dialog.
          event.preventDefault();
          contentRef.current
            ?.querySelector<HTMLElement>("[data-confirm-cancel]")
            ?.focus();
        }}
      >
        <DialogHeader className="flex-row gap-3 pr-0">
          {destructive ? (
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
            >
              <TriangleAlert className="size-[18px]" strokeWidth={1.5} />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1.5">
            <DialogTitle size={destructive ? "title-1" : "title-3"}>
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </div>
        </DialogHeader>

        <ConfirmBody
          onOpenChange={onOpenChange}
          confirmLabel={confirmLabel}
          onConfirm={onConfirm}
          destructive={destructive}
          confirmPhrase={confirmPhrase}
          cancelLabel={cancelLabel}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The typed phrase and the footer — everything in a confirmation that holds
 * state.
 *
 * It is a component, and it lives INSIDE DialogContent, for one reason: Radix
 * unmounts the content when the dialog closes, so a phrase half-typed into a
 * dialog the user backed out of cannot survive into the next thing they try to
 * delete. Unmounting IS the reset. Clearing the same two values from an effect
 * on `open` would reach the same place a cascading render later — and it would
 * blank the field while the panel is still visibly animating out.
 */
function ConfirmBody({
  onOpenChange,
  confirmLabel,
  onConfirm,
  destructive,
  confirmPhrase,
  cancelLabel,
}: {
  onOpenChange: (o: boolean) => void;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive: boolean;
  confirmPhrase?: string;
  cancelLabel: string;
}): ReactNode {
  const phraseId = useId();
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);

  const armed = confirmPhrase ? typed === confirmPhrase : true;

  const run = async (): Promise<void> => {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller owns error reporting (a `critical` toast); the dialog stays
      // open so the user can read it and retry rather than losing the context.
      setPending(false);
      return;
    }
    setPending(false);
  };

  return (
    <>
      {confirmPhrase ? (
        // Deliberately not a `Field`: its label role is `label-caps`, and
        // upper-casing the phrase would misstate the string the user has to
        // reproduce character for character.
        <div className="flex flex-col gap-1.5">
          <label htmlFor={phraseId} className="t-caption text-ink-2">
            Type{" "}
            {/* 12px mono inside 13px sans is the 0.92em x-height match of §3.2. */}
            <span className="t-mono-hash text-ink">{confirmPhrase}</span> to
            confirm
          </label>
          <Input
            id={phraseId}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            // The target is an identifier, so it is set in the mono face and
            // matched character for character (§3.5).
            className="t-mono-code"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      ) : null}

      <DialogFooter>
        <Button
          data-confirm-cancel=""
          variant="ghost"
          onClick={() => onOpenChange(false)}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "destructive" : "primary"}
          // The one solid critical fill in the product (§4.6.12). `is-solid`
          // is the opt-in Button exposes for exactly this element.
          className={destructive ? "is-solid" : undefined}
          loading={pending}
          disabled={!armed}
          onClick={() => {
            void run();
          }}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
