"use client";
import MigrationInProgress from "@/components/fira-app/MigrationInProgress";
export default function ProfileEditPage() {
  return (
    <MigrationInProgress
      title="Profile Editor"
      description="The full profile editor (with resume upload, AI summary, ATS scorer) is being upgraded to the new backend. Your basic profile can be viewed on your profile page."
      backHref="/profile"
      backLabel="View My Profile"
    />
  );
}
