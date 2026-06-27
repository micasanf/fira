"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuthModalStore } from '@/stores/auth-modal';

const headlineContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const headlineWord = {
  hidden: { opacity: 0, y: 30, filter: 'blur(6px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
const statsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.7 } },
};
const statItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stats = [
  { value: '5,000+', label: 'Deployed Workers' },
  { value: '500+', label: 'Partner Companies' },
  { value: '10+', label: 'Countries Served' },
  { value: '98%', label: 'Satisfaction Rate' },
];

export default function HeroSection() {
  const router = useRouter();
  const { openAuthModal } = useAuthModalStore();

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-white" aria-label="Hero">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -right-32 h-[700px] w-[700px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle at center, #0078D7 0%, #0078D7 30%, transparent 70%)' }} />
        <div className="absolute -bottom-20 -left-20 h-[500px] w-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle at center, #FFD700 0%, #FFD700 30%, transparent 70%)' }} />
        <div className="absolute left-1/3 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle at center, #005A9E 0%, #005A9E 40%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#005A9E 1px, transparent 1px), linear-gradient(90deg, #005A9E 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
      </div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute left-6 top-6 z-20 sm:left-10 sm:top-8 lg:left-12 lg:top-10"
      >
        <span className="inline-flex items-center gap-2.5 rounded-full border border-[#22C55E]/20 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-md">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[#22C55E]" />
          </span>
          POEA Licensed &amp; DOLE Certified
        </span>
      </motion.div>

      <div className="relative z-10 mx-auto flex min-h-[90vh] max-w-5xl flex-col items-center justify-center px-4 pt-28 pb-10 text-center sm:px-6 lg:pt-32 lg:pb-16">
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 h-1 w-16 origin-center rounded-full lg:mb-10 lg:h-1.5 lg:w-20"
          style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }}
        />

        <motion.h1
          variants={headlineContainer}
          initial="hidden"
          animate="visible"
          className="w-full font-black leading-[1.08] tracking-tight text-gray-900"
        >
          <motion.span variants={headlineWord} className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            Your Gateway to
          </motion.span>
          <motion.span variants={headlineWord} className="mt-1 block text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-[#0078D7] to-[#005A9E] bg-clip-text text-transparent">Global</span>{' '}Opportunities
          </motion.span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.55 }}
          className="mt-6 max-w-2xl text-base leading-relaxed font-light text-gray-500 sm:mt-8 sm:text-lg md:text-xl"
        >
          Connecting Filipino talent with world-class employers across the globe. Start your international career journey with FIRA today.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.7 }}
          className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:gap-5 sm:mt-10"
        >
          <Button
            onClick={() => router.push('/opportunities')}
            size="lg"
            className="group relative h-14 w-full cursor-pointer overflow-hidden rounded-full border-0 px-8 text-base font-bold shadow-lg shadow-[#FFD700]/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-[#FFD700]/30 active:scale-[0.98] sm:w-auto"
            style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', color: '#1a1a2e' }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2.5">
              Explore Opportunities
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-1">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </Button>
          <Button
            onClick={() => {
              const el = document.getElementById('how-it-works');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            variant="outline"
            size="lg"
            className="h-14 w-full cursor-pointer rounded-full border-2 border-[#0078D7]/40 bg-transparent px-8 text-base font-semibold text-[#0078D7] transition-all duration-300 hover:scale-[1.03] hover:border-[#0078D7] hover:bg-[#0078D7]/5 active:scale-[0.98] sm:w-auto"
          >
            How It Works
          </Button>
        </motion.div>
      </div>

      <motion.div variants={statsContainer} initial="hidden" animate="visible" className="relative z-10 w-full">
        <div className="w-full py-8 sm:py-10" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #E6F2FF 50%, #FFFFFF 100%)' }}>
          <div className="scrollbar-hide mx-auto flex max-w-5xl flex-row items-center justify-center gap-0 overflow-x-auto px-4 sm:px-8">
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={statItem} className="flex min-w-[140px] flex-col items-center px-6 text-center sm:min-w-[160px] sm:px-10 md:min-w-[180px] lg:px-14">
                <span className="text-2xl font-bold text-[#0078D7] sm:text-3xl">{stat.value}</span>
                <span className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-400 sm:text-sm">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
