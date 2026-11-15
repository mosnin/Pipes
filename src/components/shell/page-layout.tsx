/**
 * The two shapes a page takes, measured off the reference — see
 * `docs/SHOPIFY_MEASUREMENTS.md`.
 *
 * An index page and a single-column form are 640 wide. A detail page is two
 * columns: 652 of main, an 18px gutter, and a 292px aside, 962 in all. They
 * are different layouts, not one layout measured twice, and the earlier build
 * used 640 for both — which is why every detail page's aside read as cramped.
 *
 * Neither is centred quite exactly: the reference leaves 193 to the left of
 * the block and 200 to its right, the same ~7px reserved scrollbar gutter the
 * rail has. `me-[7px]` on an `mx-auto` block reproduces it rather than
 * pretending the asymmetry is noise.
 */
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageColumn({
  className,
  ...props
}: ComponentProps<"div">): ReactNode {
  return (
    <div
      data-slot="page-column"
      className={cn(
        "mx-auto w-full max-w-[640px] max-[1100px]:me-auto me-[7px]",
        className,
      )}
      {...props}
    />
  );
}

export function PageSplit({
  aside,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { aside: ReactNode }): ReactNode {
  return (
    <div
      data-slot="page-split"
      className={cn(
        "mx-auto grid w-full max-w-[962px] items-start gap-[18px]",
        // One column until the aside would be narrower than it was measured;
        // 962 + the rail + the pane's own gutters is where the split fits.
        "grid-cols-1 min-[1100px]:grid-cols-[minmax(0,1fr)_292px]",
        "min-[1100px]:me-[7px]",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
      <div className="flex min-w-0 flex-col gap-4">{aside}</div>
    </div>
  );
}
