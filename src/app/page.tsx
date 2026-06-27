"use client";

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/fira-landing/Header';
import Footer from '@/components/fira-landing/Footer';
import HeroSection from '@/components/fira-landing/HeroSection';
import CategoriesSection from '@/components/fira-landing/CategoriesSection';
import HowItWorks from '@/components/fira-landing/HowItWorks';
import FeaturedJobs from '@/components/fira-landing/FeaturedJobs';
import AboutSection from '@/components/fira-landing/AboutSection';
import TestimonialsSection from '@/components/fira-landing/TestimonialsSection';
import FaqSection from '@/components/fira-landing/FaqSection';
import AuthModal from '@/components/fira-landing/AuthModal';
import { useAuthModalStore } from '@/stores/auth-modal';

function AuthModalOpener() {
  const searchParams = useSearchParams();
  const { openAuthModal } = useAuthModalStore();

  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login') {
      openAuthModal('login');
    } else if (authParam === 'register') {
      openAuthModal('register');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={null}>
        <AuthModalOpener />
      </Suspense>

      <Header />

      <main id="main-content" className="flex-1" role="main" aria-label="Main content">
        <HeroSection />
        <CategoriesSection />
        <HowItWorks />
        <FeaturedJobs />
        <AboutSection />
        <TestimonialsSection />
        <FaqSection isCompact />
      </main>

      <Footer />

      {/* Auth Modal (global) */}
      <AuthModal />
    </div>
  );
}
