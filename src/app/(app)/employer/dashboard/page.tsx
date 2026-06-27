"use client";

import { useAuth } from "@/context/AuthContext";
import { LumaSpin } from "@/components/ui/luma-spin";
import EmployerDashboard from "@/components/fira-app/EmployerDashboard";

export default function EmployerDashboardPage() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
        <LumaSpin />
      </div>
    );
  }

  return <EmployerDashboard />;
}
