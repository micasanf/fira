"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function NewPostingPage() {
  return (
    <MigrationInProgress
      title="Post a New Job"
      description="The job posting creation form is being upgraded to the new backend. You can manage your existing postings from the dashboard."
      backHref="/employer/postings"
      backLabel="View My Postings"
    />
  );
}
