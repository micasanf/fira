"use client";

import { motion } from 'framer-motion';
import { Star, Quote, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Testimonial {
  id: string; name: string; position: string; company: string; country: string; story: string; rating: number;
}

const testimonials: Testimonial[] = [
  { id: '1', name: 'Maria Santos', position: 'Registered Nurse', company: 'Saudi German Hospital', country: 'Riyadh, Saudi Arabia', story: 'FIRA made my dream of working abroad a reality. From application to deployment, every step was clear and well-supported. I am now earning 3x what I made in the Philippines.', rating: 5 },
  { id: '2', name: 'Juan Dela Cruz', position: 'Civil Engineer', company: 'Arabtec Construction', country: 'Dubai, UAE', story: 'The AI matching system connected me with the perfect employer. The processing was fast and the team guided me through all the document requirements.', rating: 5 },
  { id: '3', name: 'Ana Reyes', position: 'Hotel Supervisor', company: 'Marriott International', country: 'Doha, Qatar', story: 'I was nervous about working abroad, but FIRAs ethical recruitment approach gave me confidence. They ensured fair terms and a legitimate employer.', rating: 5 },
];

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-4 ${i < rating ? 'fill-[#FFD700] text-[#FFD700]' : 'fill-gray-200 text-gray-200'}`} />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="bg-muted/30 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Success Stories from Our OFWs</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Hear from Filipino professionals who found their dream careers abroad through FIRA</p>
        </motion.div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}>
              <Card className="h-full overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="relative p-6 sm:p-8">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0078D7] via-[#005A9E] to-[#FFD700]" />
                  <Quote className="mb-4 size-8 text-[#0078D7]/15" />
                  <blockquote className="flex-1 text-sm leading-relaxed text-foreground/85 sm:text-base">&ldquo;{t.story}&rdquo;</blockquote>
                  <div className="mt-5"><StarRating rating={t.rating} /></div>
                  <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-4">
                    <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-[#0078D7] to-[#005A9E]">
                      <span className="text-sm font-bold text-white">{getInitials(t.name)}</span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                      <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <span>{t.position}</span><span aria-hidden="true">&middot;</span><span>{t.company}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                        <MapPin className="size-3" /><span>{t.country}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
