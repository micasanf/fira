"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function EmployerPostingsPage() {
  return (
    <MigrationInProgress
      title="My Job Postings"
      description="The employer job postings manager is being upgraded to the new backend. Your dashboard still shows your key stats."
      backHref="/employer/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
