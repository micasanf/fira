"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LumaSpin } from "@/components/ui/luma-spin";
import AdminDashboard from "@/components/fira-app/AdminDashboard";

export default function AdminPage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();

  if (authLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
        <LumaSpin />
      </div>
    );
  }

  // Guard: only admins can view the admin dashboard
  if (role !== "admin") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-2 rounded-lg bg-[#0078D7] px-5 py-2 text-sm font-semibold text-white hover:bg-[#005A9E]"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <AdminDashboard />;
}
