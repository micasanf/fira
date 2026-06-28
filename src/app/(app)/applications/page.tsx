"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function ApplicationsPage() {
  return (
    <MigrationInProgress
      title="Applications Board"
      description="The Kanban board for tracking applications across hiring stages is being upgraded to the new backend. You can still track your own applications on the 'Applied' page."
      backHref="/applied"
      backLabel="View My Applications"
    />
  );
}
