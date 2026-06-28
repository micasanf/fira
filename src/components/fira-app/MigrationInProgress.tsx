"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Construction } from "lucide-react";

/**
 * Graceful fallback for routes still coupled to the old Firebase backend.
 * Shows a clear "being upgraded" message instead of crashing with
 * "Something went wrong" when the Firebase compat layer can't satisfy
 * a legacy query pattern.
 */
export default function MigrationInProgress({
  title,
  description,
  backHref = "/dashboard",
  backLabel = "Back to Dashboard",
}: {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <Construction className="mx-auto mb-3 h-12 w-12 text-[#0078D7]" />
          <CardTitle className="text-xl">
            {title || "This section is being upgraded"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {description ||
              "We're finishing the migration of this page to our new backend. It will be available soon. In the meantime, please use the dashboard to navigate."}
          </p>
          <Button asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
