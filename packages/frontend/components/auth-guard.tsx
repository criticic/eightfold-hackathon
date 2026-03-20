"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export function AuthGuard({ role, children }: { role: "candidate" | "recruiter"; children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const user = getSessionUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(user.role === "recruiter" ? "/recruiter/dashboard" : "/candidate/dashboard");
    }
  }, [role, router]);

  return <>{children}</>;
}
