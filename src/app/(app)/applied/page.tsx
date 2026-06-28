'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { format } from 'date-fns';
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { LumaSpin } from "@/components/ui/luma-spin";

interface Application {
  id: string;
  opportunityId: string;
  status: string;
  submittedAt: string | Date;
  opportunityDetails?: {
    title: string;
    employerName: string;
    location: string;
  };
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  // Firestore Timestamp compat shape { seconds, nanoseconds } or { _seconds }
  if (typeof value === 'object' && value.toDate && typeof value.toDate === 'function') {
    try { return value.toDate(); } catch { return null; }
  }
  if (typeof value === 'object' && value.seconds != null) {
    return new Date(value.seconds * 1000);
  }
  return null;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch ((status || '').toLowerCase()) {
    case 'submitted': return 'secondary';
    case 'under review': return 'default';
    case 'rejected': return 'destructive';
    case 'hired': return 'default';
    default: return 'outline';
  }
}

export default function AppliedPage() {
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user) {
        if (!authLoading) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch the current user's applications from Supabase.
        const { data: apps, error } = await supabase
          .from('applications')
          .select('id, status, created_at, opportunity_id, opportunities(id, title, employer_name, location, country)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped: Application[] = (apps || []).map((a: any) => ({
          id: a.id,
          opportunityId: a.opportunity_id,
          status: a.status || 'submitted',
          submittedAt: a.created_at,
          opportunityDetails: a.opportunities
            ? {
                title: a.opportunities.title || 'Opportunity',
                employerName: a.opportunities.employer_name || '—',
                location: a.opportunities.location || a.opportunities.country || '—',
              }
            : undefined,
        }));

        setApplications(mapped);
      } catch (error) {
        console.error("Error fetching applications:", error);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
        <LumaSpin />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Your Applications</h1>
        <p className="text-muted-foreground">Track the status of your job applications.</p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-20">
              <Briefcase className="h-12 w-12 mb-4" />
              <h2 className="text-xl font-semibold">No Applications Yet</h2>
              <p>You haven&apos;t applied to any opportunities yet. Start browsing to find your next role!</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/opportunities">Browse Opportunities</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {applications.map((app) => {
            const d = toDate(app.submittedAt);
            return (
              <Card key={app.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <CardHeader>
                  <CardTitle>{app.opportunityDetails?.title || 'Opportunity Title'}</CardTitle>
                  <CardDescription>
                    {app.opportunityDetails?.employerName} - {app.opportunityDetails?.location}
                  </CardDescription>
                  {d && (
                    <p className="text-xs text-muted-foreground pt-2">
                      Applied on {format(d, 'PPP')}
                    </p>
                  )}
                </CardHeader>
                <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 md:p-6">
                  <Badge variant={getStatusVariant(app.status)}>{app.status}</Badge>
                  <Link href={`/opportunities/${app.opportunityId}`}>
                    <InteractiveHoverButton text="View Posting" className="w-auto px-4" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
