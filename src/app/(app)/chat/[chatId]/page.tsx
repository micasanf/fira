"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function ChatPage() {
  return (
    <MigrationInProgress
      title="Messages"
      description="The chat conversation view is being upgraded to the new backend."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
