"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Briefcase, CalendarCheck, Bookmark, MessageSquare, Send,
  UserPlus, TrendingUp, FileText, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ATS_STAGES, type ApplicationData, type ApplicantProfileData, type JobData,
} from '@/lib/fira-types';

// ============================
// Animation Variants
// ============================
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ============================
// Circular Progress Ring
// ============================
function ProgressRing({ percentage, size = 140, strokeWidth = 10 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const getColor = () => {
    if (percentage >= 80) return '#16a34a';
    if (percentage >= 50) return '#0078D7';
    if (percentage >= 25) return '#f59e0b';
    return '#ef4444';
  };
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-muted" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} stroke={getColor()} strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span className="text-3xl font-bold" style={{ color: getColor() }}
          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.8 }}>
          {percentage}%
        </motion.span>
        <span className="text-xs text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}

// ============================
// Suggested Improvements
// ============================
function getSuggestedImprovements(profile: ApplicantProfileData | null) {
  const suggestions: { label: string; icon: typeof UserPlus; priority: 'high' | 'medium' | 'low' }[] = [];
  if (!profile) {
    return [
      { label: 'Complete your personal information', icon: UserPlus, priority: 'high' as const },
      { label: 'Upload your passport', icon: FileText, priority: 'high' as const },
      { label: 'Add your education history', icon: FileText, priority: 'high' as const },
      { label: 'Add work experience', icon: Briefcase, priority: 'medium' as const },
    ];
  }
  if (!profile.birthdate) suggestions.push({ label: 'Add your birthdate', icon: CalendarCheck, priority: 'high' });
  if (!profile.gender) suggestions.push({ label: 'Specify your gender', icon: UserPlus, priority: 'high' });
  if (!profile.phone) suggestions.push({ label: 'Add contact number', icon: MessageSquare, priority: 'high' });
  if (!profile.passportInfo?.passportNumber) suggestions.push({ label: 'Upload Passport', icon: FileText, priority: 'high' });
  if (!profile.educations?.length) suggestions.push({ label: 'Add Education', icon: FileText, priority: 'high' });
  if (!profile.experiences?.length) suggestions.push({ label: 'Add Work Experience', icon: Briefcase, priority: 'medium' });
  if (!profile.skills?.length) suggestions.push({ label: 'Add Skills', icon: TrendingUp, priority: 'medium' });
  if (!profile.certifications?.length) suggestions.push({ label: 'Add Certification', icon: FileText, priority: 'medium' });
  if (!profile.languages?.length) suggestions.push({ label: 'Add Languages', icon: MessageSquare, priority: 'low' });
  if (!profile.governmentIds?.length) suggestions.push({ label: 'Add Government ID', icon: FileText, priority: 'low' });
  return suggestions;
}

// ============================
// Status Badge Helper
// ============================
function ApplicationStatusBadge({ status }: { status: string }) {
  const stage = ATS_STAGES.find((s) => s.key === status);
  if (!stage) return <Badge variant="outline">{status}</Badge>;
  return <Badge variant="outline" className={`${stage.color} text-white border-0`}>{stage.label}</Badge>;
}

// ============================
// Mock Data Fallbacks
// ============================
const MOCK_STATS = { applicationsSent: 12, interviewsScheduled: 3, bookmarkedJobs: 8, unreadMessages: 5 };

const MOCK_APPLICATIONS: ApplicationData[] = [
  {
    id: '1', jobId: 'j1', applicantId: 'a1', status: 'interview_scheduled', matchScore: 92,
    createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-01-20T00:00:00Z',
    job: { id: 'j1', title: 'Registered Nurse', slug: 'rn', description: '', salaryCurrency: 'USD', employmentType: 'Full-time', country: 'Saudi Arabia', status: 'active', isFeatured: false, isUrgent: false, currentApplicants: 24, viewsCount: 150, bookmarksCount: 8, createdAt: '2025-01-10T00:00:00Z', employer: { companyName: 'King Fahad Medical City', industry: 'Healthcare', country: 'Saudi Arabia' } },
    applicant: { firstName: 'Maria', lastName: 'Santos' },
  },
  {
    id: '2', jobId: 'j2', applicantId: 'a1', status: 'shortlisted', matchScore: 87,
    createdAt: '2025-01-12T00:00:00Z', updatedAt: '2025-01-18T00:00:00Z',
    job: { id: 'j2', title: 'Hotel Front Desk Manager', slug: 'hfd', description: '', salaryCurrency: 'AED', employmentType: 'Full-time', country: 'UAE', status: 'active', isFeatured: false, isUrgent: false, currentApplicants: 15, viewsCount: 90, bookmarksCount: 5, createdAt: '2025-01-08T00:00:00Z', employer: { companyName: 'Burj Al Arab', industry: 'Hospitality', country: 'UAE' } },
    applicant: { firstName: 'Maria', lastName: 'Santos' },
  },
  {
    id: '3', jobId: 'j3', applicantId: 'a1', status: 'applied', matchScore: 78,
    createdAt: '2025-01-14T00:00:00Z', updatedAt: '2025-01-14T00:00:00Z',
    job: { id: 'j3', title: 'Construction Supervisor', slug: 'cs', description: '', salaryCurrency: 'QAR', employmentType: 'Contract', country: 'Qatar', status: 'active', isFeatured: true, isUrgent: true, currentApplicants: 30, viewsCount: 200, bookmarksCount: 12, createdAt: '2025-01-05T00:00:00Z', employer: { companyName: 'Al Jazeera Construction', industry: 'Construction', country: 'Qatar' } },
    applicant: { firstName: 'Maria', lastName: 'Santos' },
  },
  {
    id: '4', jobId: 'j4', applicantId: 'a1', status: 'employer_approved', matchScore: 95,
    createdAt: '2024-12-28T00:00:00Z', updatedAt: '2025-01-16T00:00:00Z',
    job: { id: 'j4', title: 'Elementary Teacher', slug: 'et', description: '', salaryCurrency: 'SGD', employmentType: 'Full-time', country: 'Singapore', status: 'active', isFeatured: false, isUrgent: false, currentApplicants: 45, viewsCount: 300, bookmarksCount: 20, createdAt: '2024-12-20T00:00:00Z', employer: { companyName: 'Singapore MOE', industry: 'Education', country: 'Singapore' } },
    applicant: { firstName: 'Maria', lastName: 'Santos' },
  },
];

// ============================
// Main Component
// ============================
export default function ApplicantDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ApplicantProfileData | null>(null);
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [stats, setStats] = useState(MOCK_STATS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        // Try to fetch real applications from Supabase; fall back to mock data.
        const { data: appsData, error } = await supabase
          .from('applications')
          .select('id, status, created_at, opportunity_id, opportunities(id, title, location, employer_name)')
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && appsData && appsData.length > 0) {
          const mapped: ApplicationData[] = appsData.map((a: any) => ({
            id: a.id,
            jobId: a.opportunity_id,
            applicantId: user.id,
            status: a.status || 'applied',
            createdAt: a.created_at,
            updatedAt: a.created_at,
            job: a.opportunities ? {
              id: a.opportunities.id,
              title: a.opportunities.title,
              slug: a.opportunities.id,
              description: '',
              salaryCurrency: 'USD',
              employmentType: 'Full-time',
              country: a.opportunities.location || '',
              status: 'active',
              isFeatured: false,
              isUrgent: false,
              currentApplicants: 0,
              viewsCount: 0,
              bookmarksCount: 0,
              createdAt: a.created_at,
              employer: { companyName: a.opportunities.employer_name || 'Company' },
            } as JobData : undefined,
            applicant: { firstName: user.displayName || 'User', lastName: '' },
          }));
          setApplications(mapped);
          setStats((prev) => ({
            ...prev,
            applicationsSent: mapped.length,
            interviewsScheduled: mapped.filter((a) => a.status === 'interview_scheduled' || a.status === 'interview_completed').length,
          }));
        } else {
          setApplications(MOCK_APPLICATIONS);
        }
      } catch {
        setApplications(MOCK_APPLICATIONS);
      }
      setIsLoading(false);
    };
    load();
  }, [user?.id]);

  const completeness = profile?.completeness || 35;
  const suggestions = getSuggestedImprovements(profile);
  const displayName = user?.displayName || 'there';

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return dateStr; }
  };

  const statCards = [
    { label: 'Applications Sent', value: stats.applicationsSent, icon: Send, color: 'text-[#0078D7]', bgColor: 'bg-[#0078D7]/10' },
    { label: 'Interviews Scheduled', value: stats.interviewsScheduled, icon: CalendarCheck, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'Bookmarked Jobs', value: stats.bookmarkedJobs, icon: Bookmark, color: 'text-[#FFD700]', bgColor: 'bg-[#FFD700]/10' },
    { label: 'Messages', value: stats.unreadMessages, icon: MessageSquare, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ];

  const quickActions = [
    { label: 'Browse Jobs', icon: Briefcase, route: '/opportunities', color: 'bg-[#0078D7] hover:bg-[#005A9E]' },
    { label: 'Update Profile', icon: UserPlus, route: '/profile/edit', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Saved Jobs', icon: Bookmark, route: '/saved', color: 'bg-[#FFD700] hover:bg-[#e6c200] text-black' },
    { label: 'Messages', icon: MessageSquare, route: '/inbox', color: 'bg-purple-600 hover:bg-purple-700' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, <span className="text-[#0078D7]">{displayName}</span>
        </h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s what&apos;s happening with your job search today.</p>
      </motion.div>

      {/* Profile Completeness + Stats Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Profile Completeness</CardTitle>
              <CardDescription>Improve your profile to stand out to employers</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {isLoading ? <Skeleton className="size-36 rounded-full" /> : <ProgressRing percentage={completeness} />}
              {suggestions.length > 0 && (
                <div className="w-full space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suggested Improvements</p>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {suggestions.slice(0, 5).map((s) => {
                      const Icon = s.icon;
                      return (
                        <button key={s.label} onClick={() => router.push('/profile/edit')}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-accent">
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1">{s.label}</span>
                          <Badge variant={s.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">{s.priority}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {suggestions.length === 0 && <p className="text-sm text-green-600 font-medium">Your profile is complete!</p>}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-2 grid grid-cols-2 gap-4" variants={containerVariants} initial="hidden" animate="visible">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} variants={itemVariants} whileHover={{ scale: 1.02 }}>
                <Card className="h-full">
                  <CardContent className="flex items-center gap-4">
                    <div className={`flex size-12 items-center justify-center rounded-xl ${stat.bgColor}`}>
                      <Icon className={`size-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Recent Applications */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Applications</CardTitle>
              <CardDescription>Track your job application statuses</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/applied')}>
              View All <ArrowRight className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Briefcase className="size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No applications yet</p>
                <Button size="sm" onClick={() => router.push('/opportunities')}>Browse Jobs</Button>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Job Title</TableHead>
                      <TableHead className="hidden sm:table-cell">Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="hidden lg:table-cell">Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id} className="cursor-pointer transition-colors" onClick={() => app.jobId && router.push(`/opportunities/${app.jobId}`)}>
                        <TableCell className="font-medium">{app.job?.title || 'Unknown'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{app.job?.employer?.companyName || '—'}</TableCell>
                        <TableCell><ApplicationStatusBadge status={app.status} /></TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(app.createdAt)}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {app.matchScore ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                <div className={`h-full rounded-full transition-all ${app.matchScore >= 80 ? 'bg-green-500' : app.matchScore >= 60 ? 'bg-[#FFD700]' : 'bg-red-400'}`} style={{ width: `${app.matchScore}%` }} />
                              </div>
                              <span className="text-xs font-medium">{app.matchScore}%</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.div key={action.label} variants={itemVariants} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <button onClick={() => router.push(action.route)}
                className={`flex h-full flex-col items-center gap-3 rounded-xl p-5 text-white shadow-md transition-shadow hover:shadow-lg ${action.color}`}>
                <Icon className="size-6" />
                <span className="text-sm font-semibold">{action.label}</span>
              </button>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
