"use client";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthModalStore } from '@/stores/auth-modal';

interface FaqItem { id: string; question: string; answer: string; category: string; }

const faqData: FaqItem[] = [
  { id: '1', category: 'general', question: 'Is FIRA a licensed recruitment agency?', answer: 'Yes, FIRA is fully licensed by the Philippine Overseas Employment Administration (POEA) and certified by the Department of Labor and Employment (DOLE). We adhere strictly to ethical recruitment practices and Philippine labor laws.' },
  { id: '2', category: 'general', question: 'Do I need to pay placement fees?', answer: 'No. In compliance with Philippine law, FIRA charges no placement fees to job applicants. Our services for job seekers are completely free. Employer fees are governed by separate commercial agreements.' },
  { id: '3', category: 'applicants', question: 'What documents do I need to apply?', answer: 'Typically you will need: a valid passport, updated resume/CV, educational diplomas and transcripts, professional licenses (if applicable), employment certificates, NBI clearance, and medical clearance. Specific requirements vary by job and destination country.' },
  { id: '4', category: 'applicants', question: 'How long does the application process take?', answer: 'The timeline varies depending on the job, destination country, and your document readiness. On average, from application to deployment takes 2-6 months. FIRA provides regular updates throughout the process to keep you informed.' },
  { id: '5', category: 'applicants', question: 'Can I apply if I have no overseas experience?', answer: 'Absolutely. Many of our partner employers welcome first-time overseas workers. FIRA provides pre-deployment orientation and training to help you prepare for your international career.' },
  { id: '6', category: 'employers', question: 'How can my company post job openings?', answer: 'Register as an employer on FIRA, complete your company profile, and you can start posting job openings immediately. Our team will verify your company and help you find the best Filipino talent for your needs.' },
  { id: '7', category: 'employers', question: 'What types of positions can we recruit for?', answer: 'FIRA specializes in placing Filipino talent across healthcare, construction, hospitality, engineering, IT, manufacturing, domestic work, and education. We can source candidates for a wide range of roles from entry-level to specialized professionals.' },
  { id: '8', category: 'processing', question: 'What is the POEA processing flow?', answer: 'The standard POEA process includes: job offer acceptance, document verification, medical examination, visa/work permit processing, pre-departure orientation seminar (PDOS), and deployment. FIRA guides you through each step.' },
  { id: '9', category: 'processing', question: 'What support does FIRA provide after deployment?', answer: 'FIRA maintains contact with deployed workers and provides ongoing support including welfare assistance, grievance handling, and repatriation support if needed. We are committed to your wellbeing throughout your employment.' },
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'general', label: 'General' },
  { key: 'applicants', label: 'For Applicants' },
  { key: 'employers', label: 'For Employers' },
  { key: 'processing', label: 'Processing & Documents' },
] as const;

export default function FaqSection({ isCompact = false }: { isCompact?: boolean }) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const { openAuthModal } = useAuthModalStore();

  const filteredFaqs = useMemo(() => {
    if (activeCategory === 'all') return faqData;
    return faqData.filter((f) => f.category === activeCategory);
  }, [activeCategory]);

  const displayFaqs = isCompact ? filteredFaqs.slice(0, 5) : filteredFaqs;

  return (
    <section id="faq" className="relative overflow-hidden bg-gradient-to-b from-white to-[#F0F7FF] py-16 sm:py-20 lg:py-24">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0078D7]/15 bg-[#0078D7]/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#0078D7]">❓ FAQ</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Frequently Asked Questions</h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">Everything you need to know about working abroad with FIRA</p>
        </motion.div>

        {!isCompact && (
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat.key} onClick={() => { setActiveCategory(cat.key); setOpenId(null); }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${activeCategory === cat.key ? 'bg-[#0078D7] text-white shadow-md shadow-[#0078D7]/20' : 'bg-white text-muted-foreground border border-border hover:border-[#0078D7]/30 hover:text-[#0078D7]'}`}>
                {cat.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {displayFaqs.map((faq, i) => (
            <motion.div key={faq.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
                <button onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-muted/30" aria-expanded={openId === faq.id}>
                  <span className="text-base font-semibold text-foreground">{faq.question}</span>
                  <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform duration-300 ${openId === faq.id ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openId === faq.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
                      <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        {isCompact && (
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="mt-8 text-center">
            <Button variant="outline" onClick={() => { const el = document.getElementById('faq'); if (!el) return; const fullSection = el.querySelector('[data-full-faq]'); }} className="rounded-xl">
              View All FAQs
            </Button>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-[#0078D7]/15 bg-[#0078D7]/[0.03] p-8 text-center">
          <h3 className="text-xl font-bold text-foreground">Still have questions?</h3>
          <p className="max-w-md text-sm text-muted-foreground">Create an account to get personalized assistance from our team, or browse our full FAQ section.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => openAuthModal('register')} className="rounded-full bg-[#0078D7] px-6 font-semibold hover:bg-[#005A9E]">Get Started Free</Button>
            <Button variant="outline" onClick={() => { const el = document.getElementById('faq'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="rounded-full border-[#0078D7]/30 px-6 font-semibold text-[#0078D7] hover:bg-[#0078D7]/5">Contact Us</Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
