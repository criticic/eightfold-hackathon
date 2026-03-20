"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import EmployeeDashboard from "@/components/dashboards/EmployeeDashboard";
import RecruiterDashboard from "@/components/dashboards/RecruiterDashboard";
import { useTheme } from "@/components/ThemeProvider";
import clsx from "clsx";

export default function DashboardPage() {
  const { role } = useParams();
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className={clsx(
        "min-h-screen flex items-center justify-center",
        theme === "dark" ? "mesh-gradient-dark" : "mesh-gradient-light"
      )}>
        <div className={clsx(
          "text-xl font-display",
          theme === "dark" ? "text-white" : "text-black"
        )}>
          Loading...
        </div>
      </div>
    );
  }

  if (role === "employee") {
    return <EmployeeDashboard />;
  }

  if (role === "recruiter") {
    return <RecruiterDashboard />;
  }

  return null;
}
