import Link from "next/link";
import { Chip } from "@heroui/react";
import { Shield } from "lucide-react";

const ADMIN_NAV = [
  { label: "Support",  href: "/admin"          },
  { label: "Insights", href: "/admin/insights"  },
  { label: "Release",  href: "/admin/release"   },
  { label: "Issues",   href: "/admin/issues"    },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Shield size={20} className="text-slate-700 shrink-0" />
        <h1 className="text-xl font-bold text-slate-900">Admin</h1>
        <Chip color="danger" size="sm" variant="soft">Internal</Chip>
      </div>

      {/* Nav */}
      <nav className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
        {ADMIN_NAV.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-default-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
