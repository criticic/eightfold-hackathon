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
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="row" style={{ alignItems: "center" }}>
          <strong>TruthTalent</strong>
          {items.map((item) => (
            <Link key={item.href} href={item.href} style={{ opacity: pathname.startsWith(item.href) ? 1 : 0.65 }}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="row" style={{ alignItems: "center" }}>
          <span className="badge">{user?.role || "guest"}</span>
          {user?.username ? <span>{user.username}</span> : null}
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
