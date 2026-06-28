"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function EmployerProfileEditPage() {
  return (
    <MigrationInProgress
      title="Company Profile Editor"
      description="The employer company profile editor is being upgraded to the new backend."
      backHref="/employer/profile"
      backLabel="View Company Profile"
    />
  );
}
