"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const applicantLinks = [
  { label: 'Browse Jobs', href: '/opportunities' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'About Us', href: '/#about' },
];
const employerLinks = [
  { label: 'About Us', href: '/#about' },
  { label: 'FAQ', href: '/#faq' },
];
const bottomLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms' },
];

function SocialMark({ label, text }: { label: string; text: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="size-10">
      <circle cx="20" cy="20" r="19" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="central" className="fill-white text-[13px] font-semibold" fontFamily="system-ui, sans-serif">{text}</text>
    </svg>
  );
}

export default function Footer() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleNav = (href: string) => {
    if (href.startsWith('/#')) {
      const id = href.slice(2);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else router.push('/');
    } else {
      router.push(href);
    }
  };

  return (
    <footer className="mt-auto">
      <div className="h-1 w-full bg-gradient-to-r from-[#0078D7] via-[#FFD700] to-[#005A9E]" />
      <div className="bg-[#0A1628] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
            {/* Brand */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0078D7] to-[#005A9E] shadow-lg shadow-[#0078D7]/20">
                  <span className="text-lg font-extrabold text-white tracking-tight">F</span>
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-extrabold tracking-tight text-white">FIRA</span>
                  <span className="text-[10px] font-medium tracking-wide text-[#FFD700]/80">FIL INTERNATIONAL RECRUITMENT</span>
                </div>
              </div>
              <p className="max-w-[260px] text-sm leading-relaxed text-white/60">&quot;Bridging Filipino Talent to the World&quot;</p>
              <div className="flex items-center gap-2">
                <a href="#" aria-label="Facebook" className="transition-transform duration-200 hover:scale-110"><SocialMark label="Facebook" text="f" /></a>
                <a href="#" aria-label="LinkedIn" className="transition-transform duration-200 hover:scale-110"><SocialMark label="LinkedIn" text="in" /></a>
                <a href="#" aria-label="X" className="transition-transform duration-200 hover:scale-110"><SocialMark label="X" text="X" /></a>
                <a href="#" aria-label="Instagram" className="transition-transform duration-200 hover:scale-110"><SocialMark label="Instagram" text="ig" /></a>
              </div>
            </div>
            {/* For Applicants */}
            <div className="flex flex-col gap-5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">For Applicants</h3>
              <nav className="flex flex-col gap-3">
                {applicantLinks.map((link) => (
                  <button key={link.label} onClick={() => handleNav(link.href)} className="group flex w-fit items-center gap-2 text-left text-sm text-white/60 transition-colors hover:text-white">
                    <span className="inline-block size-1.5 rounded-full bg-[#FFD700]/80 transition-transform group-hover:scale-125 group-hover:bg-[#FFD700]" />
                    <span className="transition-all group-hover:translate-x-0.5">{link.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            {/* For Employers */}
            <div className="flex flex-col gap-5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">For Employers</h3>
              <nav className="flex flex-col gap-3">
                {employerLinks.map((link) => (
                  <button key={link.label} onClick={() => handleNav(link.href)} className="group flex w-fit items-center gap-2 text-left text-sm text-white/60 transition-colors hover:text-white">
                    <span className="inline-block size-1.5 rounded-full bg-[#0078D7]/80 transition-transform group-hover:scale-125 group-hover:bg-[#0078D7]" />
                    <span className="transition-all group-hover:translate-x-0.5">{link.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            {/* Contact */}
            <div className="flex flex-col gap-5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Contact</h3>
              <div className="flex flex-col gap-3 text-sm text-white/60">
                <p className="flex items-start gap-2.5 leading-relaxed"><span className="mt-0.5 shrink-0 text-base">📍</span><span>Manila, Philippines</span></p>
                <p className="flex items-center gap-2.5 leading-relaxed"><span className="shrink-0 text-base">📞</span><span>+63 2 8888 1234</span></p>
                <p className="flex items-center gap-2.5 leading-relaxed"><span className="shrink-0 text-base">✉️</span><span>info@fira.com.ph</span></p>
              </div>
            </div>
          </div>
        </div>
        {/* Newsletter */}
        <div className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-left">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white">Stay Updated</h4>
                <p className="mt-1 text-sm text-white/50">Get the latest opportunities delivered to your inbox</p>
              </div>
              <div className="hidden w-px self-stretch bg-white/10 sm:block" aria-hidden="true" />
              <div className="flex w-full items-center gap-3 lg:w-auto">
                <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-full border-white/10 bg-white/[0.06] px-5 text-sm text-white placeholder:text-white/30 focus-visible:ring-[#FFD700]/40 lg:w-72" />
                <Button onClick={() => setEmail('')} className="h-11 shrink-0 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFC000] px-6 text-sm font-semibold text-[#0A1628] shadow-lg shadow-[#FFD700]/15 hover:from-[#FFE033] hover:to-[#FFD700] active:scale-[0.97]">Subscribe</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom Bar */}
      <div className="bg-[#111D33]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-white/40">© 2025 Fil International Recruitment Agency. All rights reserved.</p>
          <span className="order-first rounded-full border border-[#FFD700]/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#FFD700]/70 sm:order-none">POEA Licensed</span>
          <nav className="flex items-center gap-1">
            {bottomLinks.map((link, i) => (
              <span key={link.label} className="flex items-center gap-1">
                <button onClick={() => handleNav(link.href)} className="text-xs text-white/40 transition-colors hover:text-white/70">{link.label}</button>
                {i < bottomLinks.length - 1 && <span className="text-white/20" aria-hidden="true">·</span>}
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
