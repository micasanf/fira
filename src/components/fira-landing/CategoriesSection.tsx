"use client";

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface CategoryItem {
  name: string; slug: string; emoji: string; jobCount: number; color: string; gradient: string;
}

const categories: CategoryItem[] = [
  { name: 'Healthcare', slug: 'healthcare', emoji: '🩺', jobCount: 245, color: '#E11D48', gradient: 'from-rose-50 to-rose-100/60' },
  { name: 'Construction', slug: 'construction', emoji: '🏗️', jobCount: 182, color: '#D97706', gradient: 'from-amber-50 to-amber-100/60' },
  { name: 'Hospitality', slug: 'hospitality', emoji: '🏨', jobCount: 156, color: '#059669', gradient: 'from-emerald-50 to-emerald-100/60' },
  { name: 'Engineering', slug: 'engineering', emoji: '⚙️', jobCount: 134, color: '#0078D7', gradient: 'from-sky-50 to-sky-100/60' },
  { name: 'Caregiving', slug: 'caregiving', emoji: '🧓', jobCount: 312, color: '#7C3AED', gradient: 'from-violet-50 to-violet-100/60' },
  { name: 'Domestic Work', slug: 'domestic-work', emoji: '🏠', jobCount: 89, color: '#0D9488', gradient: 'from-teal-50 to-teal-100/60' },
  { name: 'Manufacturing', slug: 'manufacturing', emoji: '🏭', jobCount: 112, color: '#EA580C', gradient: 'from-orange-50 to-orange-100/60' },
  { name: 'Education', slug: 'education', emoji: '📚', jobCount: 76, color: '#4F46E5', gradient: 'from-indigo-50 to-indigo-100/60' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function DestinationCard({ category }: { category: CategoryItem }) {
  const router = useRouter();
  return (
    <motion.div variants={cardVariants}>
      <motion.div
        whileHover={{ y: -8, scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 340, damping: 22 }}
        className="group relative cursor-pointer"
        onClick={() => router.push('/opportunities')}
      >
        <div className="relative flex min-h-[220px] w-full flex-col items-center justify-between overflow-hidden rounded-xl border border-white/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-[#0078D7]/12">
          <div className="flex w-full flex-col items-center gap-2 bg-gradient-to-b pt-6 pb-3">
            <div className={`flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br ${category.gradient} transition-transform duration-300 group-hover:scale-110`}>
              <span className="text-4xl leading-none select-none" role="img" aria-label={category.name}>{category.emoji}</span>
            </div>
          </div>
          <div className="flex w-full flex-1 flex-col items-center px-3">
            <h3 className="text-center text-base font-bold leading-tight text-foreground transition-colors duration-300 group-hover:text-[#0078D7]">{category.name}</h3>
          </div>
          <div className="w-full bg-gradient-to-t from-muted/40 to-transparent px-4 pb-4 pt-3">
            <div className="flex justify-center">
              <Badge className="bg-[#FFD700]/90 text-[#005A9E] hover:bg-[#FFD700] border-none text-[11px] font-bold tabular-nums px-2.5 py-0.5">
                {category.jobCount} jobs
              </Badge>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ boxShadow: `inset 0 0 0 2px ${category.color}22, 0 0 24px ${category.color}15` }} />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CategoriesSection() {
  const totalJobs = useMemo(() => categories.reduce((sum, c) => sum + c.jobCount, 0), []);
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#F0F7FF] py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-[#0078D7]/[0.03] blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-[#FFD700]/[0.04] blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-10 text-center sm:mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0078D7]/15 bg-[#0078D7]/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#0078D7]">✦ Explore</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Where Will You Work?</h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
            {categories.length} industries, <span className="font-semibold text-[#0078D7]">{totalJobs.toLocaleString()}</span> open positions. Your next destination awaits.
          </p>
        </motion.div>
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} className="lg:hidden">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {categories.map((cat) => (
              <div key={cat.slug} className="flex-none w-[180px] snap-center"><DestinationCard category={cat} /></div>
            ))}
          </div>
        </motion.div>
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} className="hidden lg:grid lg:grid-cols-8 gap-4 xl:gap-5">
          {categories.map((cat) => <DestinationCard key={cat.slug} category={cat} />)}
        </motion.div>
      </div>
    </section>
  );
}
