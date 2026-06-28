"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function BrowseEmployersPage() {
  return (
    <MigrationInProgress
      title="Browse Employers"
      description="The employer directory is being upgraded to the new backend. You can still browse job opportunities."
      backHref="/opportunities"
      backLabel="Browse Opportunities"
    />
  );
}
