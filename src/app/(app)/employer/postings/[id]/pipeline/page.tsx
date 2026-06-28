"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function PipelinePage() {
  return <MigrationInProgress title="Hiring Pipeline" description="The hiring pipeline view is being upgraded to the new backend." backHref="/employer/postings" backLabel="View My Postings" />;
}
