"use client";

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface MockJob {
  id: string; title: string; company: string; country: string; city: string; flag: string;
  salaryMin: number; salaryMax: number; salaryPeriod: string; category: string;
  skills: string[]; isFeatured: boolean; isUrgent: boolean; applicants: number; employmentType: string;
}

const mockJobs: MockJob[] = [
  { id: '1', title: 'Registered Nurse', company: 'Saudi German Hospital', country: 'saudi_arabia', city: 'Riyadh', flag: '🇸🇦', salaryMin: 1800, salaryMax: 2500, salaryPeriod: 'month', category: 'healthcare', skills: ['ICU', 'BLS', 'ACLS', 'Patient Care'], isFeatured: true, isUrgent: true, applicants: 47, employmentType: 'Full Time' },
  { id: '2', title: 'Civil Engineer', company: 'Arabtec Construction', country: 'united_arab_emirates', city: 'Dubai', flag: '🇦🇪', salaryMin: 2500, salaryMax: 3500, salaryPeriod: 'month', category: 'construction', skills: ['AutoCAD', 'Site Management', 'QA/QC'], isFeatured: false, isUrgent: false, applicants: 23, employmentType: 'Full Time' },
  { id: '3', title: 'Hotel Receptionist', company: 'Marriott International', country: 'qatar', city: 'Doha', flag: '🇶🇦', salaryMin: 1200, salaryMax: 1800, salaryPeriod: 'month', category: 'hospitality', skills: ['Customer Service', 'English', 'Opera PMS'], isFeatured: false, isUrgent: false, applicants: 31, employmentType: 'Full Time' },
  { id: '4', title: 'Software Developer', company: 'Grab Singapore', country: 'singapore', city: 'Singapore', flag: '🇸🇬', salaryMin: 3500, salaryMax: 5500, salaryPeriod: 'month', category: 'it-technology', skills: ['React', 'Node.js', 'TypeScript'], isFeatured: false, isUrgent: false, applicants: 19, employmentType: 'Full Time' },
  { id: '5', title: 'Electrician', company: 'Hyundai Engineering', country: 'south_korea', city: 'Seoul', flag: '🇰🇷', salaryMin: 2000, salaryMax: 2800, salaryPeriod: 'month', category: 'engineering', skills: ['Industrial Wiring', 'PLC', 'Maintenance'], isFeatured: false, isUrgent: false, applicants: 15, employmentType: 'Full Time' },
  { id: '6', title: 'Factory Worker', company: 'Yazaki Corporation', country: 'japan', city: 'Osaka', flag: '🇯🇵', salaryMin: 1500, salaryMax: 2000, salaryPeriod: 'month', category: 'manufacturing', skills: ['Assembly', 'Quality Control', 'Soldering'], isFeatured: false, isUrgent: false, applicants: 52, employmentType: 'Full Time' },
];

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    healthcare: '#E11D48', construction: '#D97706', hospitality: '#059669', engineering: '#0078D7',
    'it-technology': '#7C3AED', manufacturing: '#EA580C', education: '#4F46E5',
  };
  return map[category?.toLowerCase()] || '#0078D7';
}
function formatSalary(job: MockJob): string {
  const min = `$${job.salaryMin.toLocaleString()}`;
  const max = `$${job.salaryMax.toLocaleString()}`;
  return `${min} – ${max}`;
}

function SpotlightCard({ job }: { job: MockJob }) {
  const router = useRouter();
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
      <Card className="group relative cursor-pointer overflow-hidden rounded-2xl border-0 shadow-lg hover:shadow-xl transition-shadow duration-300" onClick={() => router.push('/opportunities')}>
        <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(0,120,215,0.08) 0%, rgba(0,90,158,0.03) 50%, transparent 100%)' }} />
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {job.isFeatured && <Badge className="bg-[#0078D7] text-white border-none text-xs font-bold">✦ Featured</Badge>}
            {job.isUrgent && <Badge className="bg-red-500 text-white border-none text-xs font-bold">🔥 Urgent</Badge>}
            <Badge variant="outline" className="ml-auto text-xs font-medium text-muted-foreground">{job.employmentType}</Badge>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight group-hover:text-[#0078D7] transition-colors">{job.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{job.company}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">📍 {job.flag} {job.city}</span>
            <span className="text-lg sm:text-xl font-extrabold" style={{ color: '#B8860B' }}>
              {formatSalary(job)}<span className="text-sm font-medium text-[#B8860B]/70"> /{job.salaryPeriod}</span>
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span key={skill} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{skill}</span>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-4 border-t border-border/30 pt-4 text-xs text-muted-foreground">
            <span>{job.applicants} applicants</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function JobCard({ job }: { job: MockJob }) {
  const router = useRouter();
  const borderColor = getCategoryColor(job.category);
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
      <Card className="group relative cursor-pointer overflow-hidden rounded-xl border-border/50 shadow-sm hover:shadow-lg transition-shadow duration-300" style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }} onClick={() => router.push('/opportunities')}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold text-foreground leading-tight group-hover:text-[#0078D7] transition-colors">{job.title}</h3>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{job.company}</p>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-extrabold" style={{ color: '#B8860B' }}>
              {formatSalary(job)}<span className="text-xs font-medium text-[#B8860B]/60"> /{job.salaryPeriod}</span>
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-sm text-muted-foreground">📍 {job.flag} {job.city}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.slice(0, 3).map((skill) => (
              <span key={skill} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{skill}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
            <span className="text-xs text-muted-foreground">{job.applicants} applicants</span>
            <Button size="sm" className="h-8 rounded-lg bg-[#0078D7] text-xs font-bold text-white hover:bg-[#005A9E] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
              Apply Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

export default function FeaturedJobs() {
  const router = useRouter();
  const spotlightJob = mockJobs[0];
  const gridJobs = mockJobs.slice(1);
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F8FAFC] to-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/25 bg-[#FFD700]/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#005A9E]">✦ Featured</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Spotlight Opportunities</h2>
            <p className="mt-1.5 text-muted-foreground">Handpicked positions from verified top employers</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/opportunities')} className="shrink-0 rounded-xl">
            Browse All Jobs
            <svg className="size-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Button>
        </motion.div>
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} className="flex flex-col gap-6">
          <motion.div variants={itemVariants}><SpotlightCard job={spotlightJob} /></motion.div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {gridJobs.map((job) => (
              <motion.div key={job.id} variants={itemVariants}><JobCard job={job} /></motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
