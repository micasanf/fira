"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function UserProfilePage() {
  return <MigrationInProgress title="User Profile" description="The public user profile page is being upgraded to the new backend." backHref="/dashboard" backLabel="Back to Dashboard" />;
}
