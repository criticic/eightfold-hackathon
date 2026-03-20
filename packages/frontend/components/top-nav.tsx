"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSessionUser, getSessionUser } from "@/lib/session";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getSessionUser();

  const items = user?.role === "recruiter"
    ? [
        { href: "/recruiter/dashboard", label: "Dashboard" },
        { href: "/recruiter/jds/new", label: "Create JD" },
      ]
    : [
        { href: "/candidate/dashboard", label: "Dashboard" },
        { href: "/candidate/jobs", label: "Jobs" },
        { href: "/candidate/applications", label: "Applications" },
        { href: "/candidate/profile", label: "Profile" },
      ];

  return (
    <div className="card mb-4">
      <div className="row items-center justify-between gap-y-3">
        <div className="row items-center">
          <strong className="font-serif text-xl tracking-tight text-emerald-950">RecruitOS</strong>
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1 text-sm transition ${isActive ? "bg-emerald-900 !text-emerald-50 hover:!text-emerald-50" : "bg-emerald-100/70 text-emerald-900/80 hover:bg-emerald-200/70"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="row items-center">
          <span className="badge">{user?.role || "guest"}</span>
          {user?.username ? <span className="text-sm font-medium text-emerald-950/80">{user.username}</span> : null}
          {user ? (
            <button
              className="secondary"
              onClick={() => {
                clearSessionUser();
                router.push("/login");
              }}
            >
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
