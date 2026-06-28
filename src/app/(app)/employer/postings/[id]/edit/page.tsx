"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function EditPostingPage() {
  return <MigrationInProgress title="Edit Job Posting" description="The job posting editor is being upgraded to the new backend." backHref="/employer/postings" backLabel="View My Postings" />;
}
