"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function InboxPage() {
  return (
    <MigrationInProgress
      title="Inbox"
      description="The messaging and notifications inbox is being upgraded to the new backend. You can still browse opportunities and track your applications."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
