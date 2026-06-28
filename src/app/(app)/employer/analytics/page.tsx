"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function EmployerAnalyticsPage() {
  return (
    <MigrationInProgress
      title="Employer Analytics"
      description="The detailed employer analytics dashboard is being upgraded to the new backend. Your dashboard still shows your key metrics."
      backHref="/employer/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
