import type { ReactElement } from "react";

/**
 * EmptyMembers
 *
 * Hand-authored line illustration for the collaboration empty state. Three
 * overlapping circles suggest an avatar group; the front-most circle is
 * filled with indigo as the single accent. Stroke-only otherwise.
 */
export type EmptyMembersProps = {
  size?: number;
  className?: string;
};

export function EmptyMembers({ size = 120, className }: EmptyMembersProps): ReactElement {
  const titleId = "illustration-empty-members-title";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-labelledby={titleId}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title id={titleId}>Group of three overlapping avatars.</title>
      {/* Back-left avatar */}
      <circle cx="42" cy="60" r="20" />
      {/* Back-right avatar */}
      <circle cx="78" cy="60" r="20" />
      {/* Front, accent avatar (indigo fill) */}
      <circle cx="60" cy="68" r="22" fill="#4F46E5" stroke="#4F46E5" />
    </svg>
  );
}
