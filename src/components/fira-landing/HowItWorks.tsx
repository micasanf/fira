"use client";

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthModalStore } from '@/stores/auth-modal';

const steps = [
  { number: 1, title: 'Create Your Profile', description: 'Build your professional profile with skills, experience, and documents', emoji: '✨', color: '#0078D7' },
  { number: 2, title: 'Discover Opportunities', description: 'Browse curated positions from verified international employers', emoji: '🔍', color: '#005A9E' },
  { number: 3, title: 'Get AI-Matched', description: 'Our intelligent matching system finds your perfect fit', emoji: '🎯', color: '#D97706' },
  { number: 4, title: 'Start Your Journey', description: 'Complete processing and begin your international career', emoji: '✈️', color: '#059669' },
];

const stepVariants = {
  hidden: (i: number) => ({ opacity: 0, x: i % 2 === 0 ? -40 : 40, y: 20 }),
  visible: (i: number) => ({ opacity: 1, x: 0, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.15 } }),
};
const nodeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({ scale: 1, opacity: 1, transition: { duration: 0.4, ease: 'easeOut', delay: i * 0.15 } }),
};
const pathVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1, transition: { duration: 1.2, ease: 'easeInOut' } },
};

function StepNode({ step, index, isLeft }: { step: typeof steps[number]; index: number; isLeft: boolean }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} custom={index} variants={stepVariants} initial="hidden" animate={isInView ? 'visible' : 'hidden'}
      className={`relative flex items-center gap-4 md:gap-6 lg:gap-8 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className="flex-1">
        <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg ${isLeft ? 'mr-auto max-w-sm lg:ml-auto lg:mr-4' : 'ml-auto max-w-sm lg:mr-auto lg:ml-4'}`}
          style={{ borderColor: `${step.color}20` }}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl select-none" role="img">{step.emoji}</span>
            <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
        </motion.div>
      </div>
      <div className="relative hidden md:flex items-center justify-center">
        <motion.div custom={index} variants={nodeVariants} initial="hidden" animate={isInView ? 'visible' : 'hidden'}
          className="relative z-10 flex size-14 items-center justify-center rounded-full border-4 border-white shadow-lg" style={{ backgroundColor: step.color }}>
          <span className="text-lg font-extrabold text-white">{step.number}</span>
        </motion.div>
      </div>
      <div className="flex-1 hidden md:block" />
    </motion.div>
  );
}

function MobileTimelineItem({ step, index }: { step: typeof steps[number]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref} custom={index} variants={stepVariants} initial="hidden" animate={isInView ? 'visible' : 'hidden'} className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <motion.div custom={index} variants={nodeVariants} initial="hidden" animate={isInView ? 'visible' : 'hidden'}
          className="relative z-10 flex size-12 items-center justify-center rounded-full border-4 border-white shadow-md" style={{ backgroundColor: step.color }}>
          <span className="text-sm font-extrabold text-white">{step.number}</span>
        </motion.div>
        {index < steps.length - 1 && (
          <div className="w-0.5 flex-1 my-1 rounded-full" style={{ background: `repeating-linear-gradient(to bottom, ${step.color} 0px, ${step.color} 6px, transparent 6px, transparent 12px)` }} />
        )}
      </div>
      <div className="flex-1 pb-8">
        <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: `${step.color}20` }}>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-xl select-none" role="img">{step.emoji}</span>
            <h3 className="text-base font-bold text-foreground">{step.title}</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  const { openAuthModal } = useAuthModalStore();
  const pathRef = useRef(null);
  const pathInView = useInView(pathRef, { once: true, margin: '-50px' });
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #0078D7 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-12 text-center sm:mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/[0.08] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#005A9E]">☀ Your Path</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Four Steps to Your Future</h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">A clear, guided journey from profile to placement — we handle the complexity so you can focus on your career.</p>
        </motion.div>
        <div className="relative hidden md:block" ref={pathRef}>
          <svg className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 overflow-visible" preserveAspectRatio="none">
            <motion.path d="M 0 70 C 200 70, 200 210, 0 210 C -200 210, -200 350, 0 350 C 200 350, 200 490, 0 490" fill="none" stroke="#FFD700" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" variants={pathVariants} initial="hidden" animate={pathInView ? 'visible' : 'hidden'} style={{ pathLength: 1 }} />
          </svg>
          <div className="flex flex-col gap-2">
            {steps.map((step, index) => <StepNode key={step.number} step={step} index={index} isLeft={index % 2 === 0} />)}
          </div>
        </div>
        <div className="relative md:hidden">
          <div className="flex flex-col">{steps.map((step, index) => <MobileTimelineItem key={step.number} step={step} index={index} />)}</div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.5 }} className="mt-14 flex flex-col items-center gap-3 text-center sm:mt-16">
          <p className="text-muted-foreground">Ready to start your international career?</p>
          <Button size="lg" onClick={() => openAuthModal('register')} className="h-12 rounded-xl bg-[#0078D7] px-8 font-bold text-white shadow-lg shadow-[#0078D7]/20 hover:bg-[#005A9E] transition-all duration-300">
            Get Started Free
            <svg className="size-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
