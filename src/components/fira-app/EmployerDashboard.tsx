"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Users, FileCheck, UserCheck, Plus, Eye, MessageSquare,
  TrendingUp, TrendingDown, MoreHorizontal, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ATS_STAGES, type JobData, type ApplicationData } from '@/lib/fira-types';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const applicationsChartConfig: ChartConfig = { applications: { label: 'Applications', color: '#0078D7' } };
const statusChartConfig: ChartConfig = {
  applied: { label: 'Applied', color: '#3b82f6' },
  shortlisted: { label: 'Shortlisted', color: '#22c55e' },
  interview: { label: 'Interview', color: '#eab308' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  hired: { label: 'Hired', color: '#8b5cf6' },
};

const MOCK_STATS = { activeJobs: 8, totalApplications: 156, newToday: 12, hired: 23 };

const MOCK_POSTED_JOBS: JobData[] = [
  { id: 'j1', title: 'Registered Nurse', slug: 'rn', description: '', salaryCurrency: 'USD', employmentType: 'Full-time', country: 'Saudi Arabia', status: 'active', isFeatured: false, isUrgent: true, currentApplicants: 24, viewsCount: 150, bookmarksCount: 8, createdAt: '2025-01-10T00:00:00Z', employer: { companyName: 'King Fahad Medical City', industry: 'Healthcare', country: 'Saudi Arabia' } },
  { id: 'j2', title: 'Hotel Front Desk Manager', slug: 'hfd', description: '', salaryCurrency: 'AED', employmentType: 'Full-time', country: 'UAE', status: 'active', isFeatured: false, isUrgent: false, currentApplicants: 15, viewsCount: 90, bookmarksCount: 5, createdAt: '2025-01-08T00:00:00Z', employer: { companyName: 'Burj Al Arab', industry: 'Hospitality', country: 'UAE' } },
  { id: 'j3', title: 'Construction Supervisor', slug: 'cs', description: '', salaryCurrency: 'QAR', employmentType: 'Contract', country: 'Qatar', status: 'active', isFeatured: true, isUrgent: false, currentApplicants: 30, viewsCount: 200, bookmarksCount: 12, createdAt: '2025-01-05T00:00:00Z', employer: { companyName: 'Al Jazeera Construction', industry: 'Construction', country: 'Qatar' } },
  { id: 'j4', title: 'Welder / Fabricator', slug: 'welder', description: '', salaryCurrency: 'QAR', employmentType: 'Contract', country: 'Qatar', status: 'paused', isFeatured: false, isUrgent: false, currentApplicants: 42, viewsCount: 280, bookmarksCount: 18, createdAt: '2024-12-20T00:00:00Z', employer: { companyName: 'Al Jazeera Construction', industry: 'Construction', country: 'Qatar' } },
];

const MOCK_APPLICATIONS: ApplicationData[] = [
  { id: 'a1', jobId: 'j1', applicantId: 'p1', applicant: { firstName: 'Maria', lastName: 'Santos' }, status: 'interview_scheduled', matchScore: 92, createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-01-20T00:00:00Z', job: { id: 'j1', title: 'Registered Nurse', slug: 'rn', description: '', salaryCurrency: 'USD', employmentType: 'Full-time', country: 'Saudi Arabia', status: 'active', isFeatured: false, isUrgent: false, currentApplicants: 24, viewsCount: 150, bookmarksCount: 8, createdAt: '2025-01-10T00:00:00Z' } },
  { id: 'a2', jobId: 'j1', applicantId: 'p2', applicant: { firstName: 'Juan', lastName: 'Cruz' }, status: 'shortlisted', matchScore: 88, createdAt: '2025-01-14T00:00:00Z', updatedAt: '2025-01-18T00:00:00Z', job: { id: 'j1', title: 'Registered Nurse', slug: 'rn', description: '', salaryCurrency: 'USD', employmentType: 'Full-time', country: 'Saudi Arabia', status: 'active', isFeatured: false, isUrgent: false, currentApplicants: 24, viewsCount: 150, bookmarksCount: 8, createdAt: '2025-01-10T00:00:00Z' } },
  { id: 'a3', jobId: 'j2', applicantId: 'p3', applicant: { firstName: 'Ana', lastName: 'Reyes' }, status: 'applied', matchScore: 75, createdAt: '2025-01-16T00:00:00Z', updatedAt: '2025-01-16T00:00:00Z', job: { id: 'j2', title: 'Hotel Front Desk Manager', slug: 'hfd', description: '', salaryCurrency: 'AED', employmentType: 'Full-time', country: 'UAE', status: 'active', isFeatured: false, isUrgent: false, currentApplicants: 15, viewsCount: 90, bookmarksCount: 5, createdAt: '2025-01-08T00:00:00Z' } },
  { id: 'a4', jobId: 'j3', applicantId: 'p4', applicant: { firstName: 'Pedro', lastName: 'Garcia' }, status: 'employer_approved', matchScore: 95, createdAt: '2025-01-12T00:00:00Z', updatedAt: '2025-01-19T00:00:00Z', job: { id: 'j3', title: 'Construction Supervisor', slug: 'cs', description: '', salaryCurrency: 'QAR', employmentType: 'Contract', country: 'Qatar', status: 'active', isFeatured: true, isUrgent: false, currentApplicants: 30, viewsCount: 200, bookmarksCount: 12, createdAt: '2025-01-05T00:00:00Z' } },
  { id: 'a5', jobId: 'j1', applicantId: 'p5', applicant: { firstName: 'Rosa', lastName: 'Lim' }, status: 'screening', matchScore: 70, createdAt: '2025-01-17T00:00:00Z', updatedAt: '2025-01-17T00:00:00Z', job: { id: 'j1', title: 'Registered Nurse', slug: 'rn', description: '', salaryCurrency: 'USD', employmentType: 'Full-time', country: 'Saudi Arabia', status: 'active', isFeatured: false, isUrgent: false, currentApplicants: 24, viewsCount: 150, bookmarksCount: 8, createdAt: '2025-01-10T00:00:00Z' } },
];

const applicationsOverTime = [
  { month: 'Aug', applications: 12 }, { month: 'Sep', applications: 19 },
  { month: 'Oct', applications: 28 }, { month: 'Nov', applications: 22 },
  { month: 'Dec', applications: 35 }, { month: 'Jan', applications: 42 },
];
const applicationsByStatus = [
  { status: 'Applied', applied: 68 }, { status: 'Shortlisted', shortlisted: 32 },
  { status: 'Interview', interview: 18 }, { status: 'Rejected', rejected: 15 },
  { status: 'Hired', hired: 23 },
];

function ApplicationStatusBadge({ status }: { status: string }) {
  const stage = ATS_STAGES.find((s) => s.key === status);
  if (!stage) return <Badge variant="outline">{status}</Badge>;
  return <Badge variant="outline" className={`${stage.color} text-white border-0`}>{stage.label}</Badge>;
}
function formatDate(dateStr: string) {
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return dateStr; }
}
function jobStatusVariant(status: string) {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'paused': return 'bg-yellow-100 text-yellow-700';
    case 'closed': return 'bg-red-100 text-red-700';
    default: return '';
  }
}

export default function EmployerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [stats, setStats] = useState(MOCK_STATS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        // Try to fetch employer's posted jobs from Supabase; fall back to mock.
        if (user?.id) {
          const { data: jobsData, error: jobsErr } = await supabase
            .from('opportunities')
            .select('id, title, country, status, created_at, employer_id, current_applicants')
            .eq('employer_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
          if (!jobsErr && jobsData && jobsData.length > 0) {
            setJobs(jobsData.map((j: any) => ({
              id: j.id, title: j.title, slug: j.id, description: '', salaryCurrency: 'USD',
              employmentType: 'Full-time', country: j.country || '', status: j.status || 'active',
              isFeatured: false, isUrgent: false, currentApplicants: j.current_applicants || 0,
              viewsCount: 0, bookmarksCount: 0, createdAt: j.created_at,
            })));
          } else {
            setJobs(MOCK_POSTED_JOBS);
          }
        } else {
          setJobs(MOCK_POSTED_JOBS);
        }
      } catch {
        setJobs(MOCK_POSTED_JOBS);
      }
      setApplications(MOCK_APPLICATIONS);
      setIsLoading(false);
    };
    load();
  }, [user?.id]);

  const companyName = user?.displayName || 'My Company';

  const statCards = [
    { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, trend: '+2', up: true, color: 'text-[#0078D7]', bgColor: 'bg-[#0078D7]/10' },
    { label: 'Total Applications', value: stats.totalApplications, icon: FileCheck, trend: '+18%', up: true, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'New Today', value: stats.newToday, icon: Users, trend: '+5', up: true, color: 'text-[#FFD700]', bgColor: 'bg-[#FFD700]/10' },
    { label: 'Hired', value: stats.hired, icon: UserCheck, trend: '+3', up: true, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ];

  const quickActions = [
    { label: 'Post New Job', icon: Plus, route: '/employer/postings/new', color: 'bg-[#0078D7] hover:bg-[#005A9E]' },
    { label: 'View Applications', icon: FileCheck, route: '/employer/postings', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Messages', icon: MessageSquare, route: '/inbox', color: 'bg-purple-600 hover:bg-purple-700' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Employer Dashboard</h1>
            <div className="flex items-center gap-1.5 rounded-full bg-[#0078D7]/10 px-2.5 py-1 text-xs font-medium text-[#0078D7]">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              Verified
            </div>
          </div>
          <p className="mt-1 text-muted-foreground">{companyName} — Manage your job postings and applications</p>
        </div>
        <Button onClick={() => router.push('/employer/postings/new')} className="shrink-0">
          <Plus className="size-4" /> Post New Job
        </Button>
      </motion.div>

      <motion.div className="grid grid-cols-2 gap-4 lg:grid-cols-4" variants={containerVariants} initial="hidden" animate="visible">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} variants={itemVariants} whileHover={{ scale: 1.02 }}>
              <Card className="h-full">
                <CardContent className="flex items-center gap-4">
                  <div className={`flex size-12 items-center justify-center rounded-xl ${stat.bgColor}`}>
                    <Icon className={`size-5 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.up ? 'text-green-600' : 'text-red-500'}`}>
                    {stat.up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    {stat.trend}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div className="flex flex-wrap gap-3" variants={containerVariants} initial="hidden" animate="visible">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.div key={action.label} variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <button onClick={() => router.push(action.route)}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-shadow hover:shadow-lg ${action.color}`}>
                <Icon className="size-4" />{action.label}
              </button>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-2">
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Posted Jobs</CardTitle>
                <CardDescription>Your active and recent job postings</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/employer/postings')}>
                View All <ArrowRight className="size-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
              ) : (
                <div className="max-h-96 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="hidden md:table-cell">Applicants</TableHead>
                        <TableHead className="hidden lg:table-cell">Created</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id} className="cursor-pointer" onClick={() => router.push(`/employer/postings/${job.id}/applicants`)}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{job.title}</p>
                              <p className="text-xs text-muted-foreground hidden sm:block">{job.country}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary" className={`text-xs ${jobStatusVariant(job.status)}`}>
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                              {job.isUrgent && <span className="ml-1 text-red-500">!</span>}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{job.currentApplicants}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{formatDate(job.createdAt)}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="size-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="size-4" />
                            </Button>
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

        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Applications</CardTitle>
                <CardDescription>Latest candidates who applied to your jobs</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/employer/postings')}>
                View All <ArrowRight className="size-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
              ) : (
                <div className="max-h-96 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Applicant</TableHead>
                        <TableHead className="hidden sm:table-cell">Job</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id} className="cursor-pointer">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex size-8 items-center justify-center rounded-full bg-[#0078D7]/10 text-xs font-semibold text-[#0078D7]">
                                {app.applicant?.firstName?.[0]}{app.applicant?.lastName?.[0]}
                              </div>
                              <span className="font-medium">{app.applicant?.firstName} {app.applicant?.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{app.job?.title}</TableCell>
                          <TableCell><ApplicationStatusBadge status={app.status} /></TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{formatDate(app.createdAt)}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="size-8" onClick={() => router.push('/employer/postings')}>
                              <Eye className="size-4" />
                            </Button>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Applications Over Time</CardTitle>
              <CardDescription>Monthly application trend for your postings</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={applicationsChartConfig} className="h-[300px] w-full">
                <LineChart data={applicationsOverTime} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="applications" stroke="#0078D7" strokeWidth={2.5} dot={{ r: 4, fill: '#0078D7' }} activeDot={{ r: 6, fill: '#0078D7' }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Applications by Status</CardTitle>
              <CardDescription>Breakdown of candidate statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={statusChartConfig} className="h-[300px] w-full">
                <BarChart data={applicationsByStatus} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="status" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="applied" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="shortlisted" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="interview" fill="#eab308" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hired" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
