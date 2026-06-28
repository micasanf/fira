"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function InsightsPage() {
  return (
    <MigrationInProgress
      title="Career Insights"
      description="The personalized career insights dashboard is being upgraded to the new backend. Check back soon for AI-powered recommendations."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
