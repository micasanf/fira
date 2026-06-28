'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Loader2, Edit, Trash2, Users, Archive, ArchiveRestore } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Safe date parser that handles string | Date | Firestore Timestamp-like shapes.
function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (v?.toDate) {
    try { return v.toDate(); } catch { return null; }
  }
  if (v?.seconds != null) return new Date(v.seconds * 1000);
  return null;
}

interface Posting {
  id: string;
  title: string;
  status: string;
  applicants: number;
  postedAt: any;
  createdAt?: any;
}

export default function EmployerPostingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [postings, setPostings] = useState<Posting[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchPostings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      // Fetch employer's opportunities, newest first.
      const { data: opps, error } = await supabase
        .from('opportunities')
        .select('id, title, status, posted_at, created_at, application_count')
        .eq('employer_id', user.id)
        .order('posted_at', { ascending: false });

      if (error) throw error;

      // Fetch real application counts per opportunity for accuracy.
      const opportunityIds = (opps || []).map((o: any) => o.id);
      const applicantCounts: Record<string, number> = {};
      if (opportunityIds.length > 0) {
        const { data: apps, error: appsError } = await supabase
          .from('applications')
          .select('opportunity_id')
          .in('opportunity_id', opportunityIds);
        if (!appsError && apps) {
          for (const a of apps as any[]) {
            const oid = a.opportunity_id;
            if (oid) applicantCounts[oid] = (applicantCounts[oid] || 0) + 1;
          }
        }
      }

      const postingsData: Posting[] = (opps || []).map((o: any) => ({
        id: o.id,
        title: o.title || 'Untitled',
        status: o.status || 'active',
        applicants: applicantCounts[o.id] ?? o.application_count ?? 0,
        postedAt: o.posted_at,
        createdAt: o.created_at,
      }));
      setPostings(postingsData);
    } catch (error) {
      console.error('Error fetching postings:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch postings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchPostings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const filteredPostings = useMemo(() => {
    if (statusFilter === 'all') return postings;
    return postings.filter((p) => (p.status || '').toLowerCase() === statusFilter);
  }, [postings, statusFilter]);

  const handleUpdateStatus = async (postingId: string, status: 'active' | 'archived') => {
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ status, is_active: status === 'active', updated_at: new Date().toISOString() })
        .eq('id', postingId);
      if (error) throw error;

      toast({
        title: status === 'active' ? 'Posting Restored' : 'Posting Archived',
        description: `The job posting has been successfully ${status === 'active' ? 'restored' : 'archived'}.`,
      });
      fetchPostings();
    } catch (error) {
      console.error(`Error updating status for posting ${postingId}:`, error);
      toast({
        title: 'Error',
        description: 'Could not update the posting status.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (postingId: string) => {
    try {
      const { error } = await supabase.from('opportunities').delete().eq('id', postingId);
      if (error) throw error;
      toast({
        title: 'Posting Deleted',
        description: 'The job posting has been permanently deleted.',
      });
      fetchPostings();
    } catch (error) {
      console.error(`Error deleting posting ${postingId}:`, error);
      toast({
        title: 'Error',
        description: 'Could not delete the posting.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Postings</h1>
          <p className="text-muted-foreground">Manage your job postings and view applicants.</p>
        </div>
        <Button asChild>
          <Link href="/employer/postings/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Posting
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Your Postings</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription>A list of all job opportunities you have posted.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPostings.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No postings match the current filter.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/employer/postings/new">Post your first job</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Applicants</TableHead>
                  <TableHead className="text-right">Posted On</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPostings.map((posting) => {
                  const d = toDate(posting.postedAt) || toDate(posting.createdAt);
                  const isActive = (posting.status || '').toLowerCase() === 'active';
                  return (
                    <TableRow key={posting.id}>
                      <TableCell className="font-medium">{posting.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={isActive ? 'secondary' : 'outline'}
                          className={isActive ? 'text-green-600 border-green-200 bg-green-50' : ''}
                        >
                          {posting.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{posting.applicants}</TableCell>
                      <TableCell className="text-right">{d ? format(d, 'PPP') : '—'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/employer/postings/${posting.id}/applicants`}>
                                <Users className="mr-2 h-4 w-4" />
                                View Applicants
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/employer/postings/${posting.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Posting
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(posting.status || '').toLowerCase() === 'archived' ? (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(posting.id, 'active')}>
                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                Unarchive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(posting.id, 'archived')}>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this job posting and all related data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(posting.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
