"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function EmployerProfilePage() {
  return (
    <MigrationInProgress
      title="Company Profile"
      description="The public company profile page is being upgraded to the new backend."
      backHref="/employer/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
