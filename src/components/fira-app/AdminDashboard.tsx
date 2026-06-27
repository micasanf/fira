"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Users, Building2, Briefcase, FileText, Clock, ArrowUpRight, ArrowDownRight,
  Shield, BarChart3, Settings, FileCheck, UserCheck, Globe2, Landmark,
  TrendingUp, Activity, Search, ChevronRight, UserCog, FileSearch,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ATS_STAGES } from '@/lib/fira-types';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const countryChartConfig: ChartConfig = { count: { label: 'Applications', color: '#0078D7' } };
const categoryChartConfig: ChartConfig = {
  healthcare: { label: 'Healthcare', color: '#ef4444' },
  construction: { label: 'Construction', color: '#f59e0b' },
  hospitality: { label: 'Hospitality', color: '#22c55e' },
  engineering: { label: 'Engineering', color: '#0078D7' },
  it: { label: 'IT', color: '#8b5cf6' },
};
const trendChartConfig: ChartConfig = {
  applicants: { label: 'Applicants', color: '#0078D7' },
  jobs: { label: 'Jobs', color: '#FFD700' },
  deployments: { label: 'Deployments', color: '#22c55e' },
};

const MOCK_METRICS = {
  totalApplicants: 2847, totalEmployers: 156, totalJobs: 89, totalApplications: 4231,
  activeJobs: 34, pendingReview: 47, inPipeline: 312, deployed: 185, rehirePool: 89,
};

const MOCK_PIPELINE = [
  { key: 'applied', count: 4231, label: 'Applied' },
  { key: 'screening', count: 2847, label: 'Screening' },
  { key: 'document_verification', count: 1890, label: 'Doc Verification' },
  { key: 'ai_matching', count: 1456, label: 'AI Matching' },
  { key: 'shortlisted', count: 890, label: 'Shortlisted' },
  { key: 'interview_scheduled', count: 456, label: 'Interview' },
  { key: 'employer_approved', count: 312, label: 'Approved' },
  { key: 'medical', count: 234, label: 'Medical' },
  { key: 'visa_processing', count: 198, label: 'Visa' },
  { key: 'deployed', count: 185, label: 'Deployed' },
];

const MOCK_COUNTRY_DATA = [
  { country: 'Saudi Arabia', count: 1200 }, { country: 'UAE', count: 890 },
  { country: 'Singapore', count: 650 }, { country: 'Qatar', count: 420 },
  { country: 'Kuwait', count: 310 }, { country: 'Japan', count: 280 },
  { country: 'Canada', count: 180 }, { country: 'Australia', count: 150 },
];

const MOCK_CATEGORY_DATA = [
  { name: 'healthcare', value: 1500 }, { name: 'construction', value: 980 },
  { name: 'hospitality', value: 650 }, { name: 'engineering', value: 520 },
  { name: 'it', value: 380 }, { name: 'domestic', value: 280 },
  { name: 'education', value: 190 }, { name: 'manufacturing', value: 120 },
];

const PIE_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#0078D7', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const MOCK_TRENDS = [
  { month: 'Jul', applicants: 180, jobs: 12, deployments: 15 },
  { month: 'Aug', applicants: 220, jobs: 15, deployments: 18 },
  { month: 'Sep', applicants: 195, jobs: 18, deployments: 22 },
  { month: 'Oct', applicants: 280, jobs: 22, deployments: 25 },
  { month: 'Nov', applicants: 310, jobs: 28, deployments: 30 },
  { month: 'Dec', applicants: 260, jobs: 25, deployments: 28 },
  { month: 'Jan', applicants: 340, jobs: 32, deployments: 35 },
];

const MOCK_RECENT = [
  { id: '1', name: 'Maria Santos', action: 'Applied to', target: 'Senior Caregiver', time: '2 min ago', type: 'applicant' },
  { id: '2', name: 'Al-Rashid Group', action: 'Posted job', target: 'Civil Engineer', time: '15 min ago', type: 'employer' },
  { id: '3', name: 'Juan Dela Cruz', action: 'Status updated to', target: 'Interview Scheduled', time: '1 hour ago', type: 'status' },
  { id: '4', name: 'Singapore General Hospital', action: 'Approved', target: '12 candidates', time: '2 hours ago', type: 'employer' },
  { id: '5', name: 'Ana Reyes', action: 'Document verified:', target: 'Passport & TESDA', time: '3 hours ago', type: 'status' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const metrics = [
    { label: 'Total Applicants', value: MOCK_METRICS.totalApplicants, icon: Users, trend: '+12%', up: true, color: 'text-[#0078D7]', bgColor: 'bg-[#0078D7]/10' },
    { label: 'Total Employers', value: MOCK_METRICS.totalEmployers, icon: Building2, trend: '+5%', up: true, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    { label: 'Active Jobs', value: MOCK_METRICS.activeJobs, icon: Briefcase, trend: '+8%', up: true, color: 'text-[#FFD700]', bgColor: 'bg-[#FFD700]/10' },
    { label: 'Total Applications', value: MOCK_METRICS.totalApplications, icon: FileText, trend: '+15%', up: true, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { label: 'Pending Review', value: MOCK_METRICS.pendingReview, icon: Clock, trend: '+3', up: true, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { label: 'In Pipeline', value: MOCK_METRICS.inPipeline, icon: Activity, trend: '+18%', up: true, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
    { label: 'Deployed', value: MOCK_METRICS.deployed, icon: Globe2, trend: '+22%', up: true, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'Rehire Pool', value: MOCK_METRICS.rehirePool, icon: UserCheck, trend: '+8', up: true, color: 'text-rose-600', bgColor: 'bg-rose-100' },
  ];

  // Admin nav cards — route to micasanf admin sub-pages where available.
  const navCards = [
    { label: 'Manage Applicants', icon: UserCog, route: '/admin', color: 'from-blue-500 to-blue-600', count: 2847 },
    { label: 'Manage Employers', icon: Building2, route: '/admin', color: 'from-emerald-500 to-emerald-600', count: 156 },
    { label: 'Job Approval', icon: FileCheck, route: '/admin', color: 'from-amber-500 to-amber-600', count: 47 },
    { label: 'Pipeline', icon: Activity, route: '/admin', color: 'from-purple-500 to-purple-600', count: 312 },
    { label: 'CMS', icon: FileText, route: '/admin', color: 'from-pink-500 to-pink-600' },
    { label: 'Audit Logs', icon: FileSearch, route: '/admin', color: 'from-slate-500 to-slate-600' },
    { label: 'Analytics', icon: BarChart3, route: '/analytics', color: 'from-cyan-500 to-cyan-600' },
    { label: 'Settings', icon: Settings, route: '/profile/edit', color: 'from-gray-500 to-gray-600' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#0078D7]/10">
              <Shield className="size-5 text-[#0078D7]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Control Panel</h1>
              <p className="text-sm text-muted-foreground">Manage the entire recruitment platform</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="w-64 pl-9" />
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <span className="size-2 rounded-full bg-green-500" />
            System Online
          </Badge>
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-2 gap-4 lg:grid-cols-4" variants={containerVariants} initial="hidden" animate="visible">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <motion.div key={m.label} variants={itemVariants} whileHover={{ scale: 1.02 }}>
              <Card className="h-full">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex size-11 items-center justify-center rounded-xl ${m.bgColor}`}>
                    <Icon className={`size-5 ${m.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold">{isLoading ? <Skeleton className="h-6 w-12" /> : m.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${m.up ? 'text-green-600' : 'text-red-500'}`}>
                    {m.up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                    {m.trend}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-[#0078D7]" />
              Recruitment Pipeline
            </CardTitle>
            <CardDescription>Applications flow through each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-4 min-w-max">
                {MOCK_PIPELINE.map((stage) => {
                  const stageDef = ATS_STAGES.find((s) => s.key === stage.key);
                  return (
                    <div key={stage.key} className="flex flex-col items-center gap-1.5 min-w-[80px]">
                      <div className={`h-20 w-20 rounded-xl flex flex-col items-center justify-center text-white shadow-md ${stageDef?.color || 'bg-slate-500'}`}>
                        <span className="text-lg font-bold">{isLoading ? '--' : stage.count.toLocaleString()}</span>
                        <span className="text-[10px] opacity-80 leading-tight text-center px-1">{stage.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4" variants={containerVariants} initial="hidden" animate="visible">
        {navCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} variants={itemVariants} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Card className="cursor-pointer transition-shadow hover:shadow-lg overflow-hidden" onClick={() => router.push(card.route)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.color} text-white shadow-sm`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{card.label}</p>
                      {card.count !== undefined && <p className="text-xs text-muted-foreground">{card.count.toLocaleString()}</p>}
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Globe2 className="size-4 text-[#0078D7]" />Applications by Country</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={countryChartConfig} className="h-[280px] w-full">
                <BarChart data={MOCK_COUNTRY_DATA} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="country" className="text-xs" width={65} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#0078D7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Landmark className="size-4 text-[#FFD700]" />Jobs by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={categoryChartConfig} className="h-[280px] w-full">
                <PieChart>
                  <Pie data={MOCK_CATEGORY_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                    {MOCK_CATEGORY_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {MOCK_CATEGORY_DATA.map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="capitalize text-muted-foreground">{cat.name}</span>
                    <span className="ml-auto font-medium">{cat.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="size-4 text-emerald-600" />Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={trendChartConfig} className="h-[280px] w-full">
                <LineChart data={MOCK_TRENDS} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="applicants" stroke="#0078D7" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="jobs" stroke="#FFD700" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="deployments" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest actions across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>User / Entity</TableHead>
                    <TableHead className="hidden sm:table-cell">Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="hidden md:table-cell">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_RECENT.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${item.type === 'applicant' ? 'bg-[#0078D7]/10 text-[#0078D7]' : item.type === 'employer' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {item.name.charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{item.action}</TableCell>
                      <TableCell className="font-medium text-sm">{item.target}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{item.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
