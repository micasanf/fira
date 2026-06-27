"use client";

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

const trustBadges = ['POEA Licensed', 'DOLE Certified', 'Ethical Recruitment', 'ISO Standards'];

const values = [
  { title: 'Integrity', description: 'We operate with full transparency and ethical recruitment practices, adhering to POEA and DOLE regulations.', emoji: '🛡️' },
  { title: 'Excellence', description: 'We strive for the highest standards in matching talent with opportunity, ensuring quality placements.', emoji: '⭐' },
  { title: 'Care', description: 'We treat every applicant as family, supporting them through every step of their journey abroad.', emoji: '❤️' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 } }),
};

export default function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0078D7]/15 bg-[#0078D7]/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#0078D7]">🏛️ About FIRA</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Bridging Filipino Talent to the World</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Fil International Recruitment Agency (FIRA) is a POEA-licensed agency dedicated to connecting Filipino professionals with verified international employers.
          </p>
        </motion.div>

        {/* Trust badges */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-12 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {trustBadges.map((badge, i) => (
            <motion.span key={badge} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/[0.06] px-4 py-2 text-sm font-semibold text-[#005A9E]">
              <span className="size-2 rounded-full bg-[#FFD700]" />{badge}
            </motion.span>
          ))}
        </motion.div>

        {/* Values grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {values.map((value, i) => (
            <motion.div key={value.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Card className="h-full border-border/50 shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-3 text-3xl">{value.emoji}</div>
                  <h3 className="mb-2 text-lg font-bold text-foreground">{value.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
