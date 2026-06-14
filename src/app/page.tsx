'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LumaSpin } from '@/components/ui/luma-spin';
import Link from 'next/link';
import Image from 'next/image';
import {
  Globe,
  Sparkles,
  Briefcase,
  Users,
  ArrowRight,
  ChevronRight,
  FileText,
  MessageSquare,
  BarChart3,
  Shield,
  Star,
} from 'lucide-react';

export default function Home() {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect logged-in users
  useEffect(() => {
    if (!loading && user) {
      if (role === 'employer') {
        router.push('/employer/dashboard');
      } else if (role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, role, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LumaSpin />
          <p className="text-muted-foreground">Loading FIRA...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/favicon.ico"
              alt="FIRA logo"
              width={32}
              height={32}
              className="rounded-md"
            />
            <span className="font-headline text-xl font-bold text-primary">
              FIRA
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#ai-tools" className="hover:text-foreground transition-colors">
              AI Tools
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <Globe className="w-4 h-4" />
            Connecting Filipino Talent to the World
          </div>

          {/* Headline */}
          <h1 className="font-headline text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight mb-6">
            Your Global Career{' '}
            <span className="text-primary">Starts Here</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            FIRA — Fil International Recruitment Agency — empowers Filipino professionals with AI-powered tools, international job opportunities, and seamless connections to global employers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-border px-8 py-4 rounded-xl text-lg font-medium text-foreground hover:bg-muted/50 transition-all"
            >
              Sign In
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-xs font-bold text-primary"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p>Join thousands of Filipino professionals already on FIRA</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Land Your Dream Job
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From AI-powered resume building to interview prep, FIRA gives you the competitive edge in the global job market.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Briefcase className="w-6 h-6" />,
                title: 'International Opportunities',
                desc: 'Access curated job listings from top employers across the globe, specifically looking for Filipino talent.',
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: 'AI-Powered Tools',
                desc: 'Build resumes, prepare for interviews, negotiate salaries, and write cover letters with cutting-edge AI assistance.',
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: 'Direct Employer Connections',
                desc: 'Chat and video call with international employers directly through our secure platform.',
              },
              {
                icon: <FileText className="w-6 h-6" />,
                title: 'Smart Resume Builder',
                desc: 'Create ATS-friendly resumes tailored to international standards with our AI resume builder.',
              },
              {
                icon: <MessageSquare className="w-6 h-6" />,
                title: 'Interview Preparation',
                desc: 'Practice with AI-generated questions and get real-time feedback to ace your interviews.',
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: 'Salary Insights',
                desc: 'Know your worth with AI-powered salary analysis and negotiation guidance for global markets.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-headline font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Tools Section */}
      <section id="ai-tools" className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Powered by AI
            </div>
            <h2 className="font-headline text-3xl sm:text-4xl font-bold text-foreground mb-4">
              17 AI Tools at Your Fingertips
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Leverage the power of Google Gemini AI to supercharge every step of your job search.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[
              'Resume Builder',
              'Cover Letter Writer',
              'Interview Prep',
              'Salary Negotiator',
              'Skill Gap Analysis',
              'Career Path Planner',
              'LinkedIn Optimizer',
              'Email Templates',
              'Resume Match',
              'Job Description Saver',
              'Enhanced Text',
              'Improve Message',
              'Profile Optimizer',
              'Application Tracker',
              'Market Insights',
              'Skill Recommendations',
              'Career Coaching',
            ].map((tool, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {tool}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How FIRA Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to launch your international career.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Your Profile',
                desc: 'Sign up for free and build your professional profile with our AI-powered resume builder.',
              },
              {
                step: '02',
                title: 'Discover Opportunities',
                desc: 'Browse curated international job listings matched to your skills and experience.',
              },
              {
                step: '03',
                title: 'Connect & Get Hired',
                desc: 'Chat with employers, ace your interview with AI prep, and land your dream job abroad.',
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-headline font-bold">
                  {item.step}
                </div>
                <h3 className="font-headline font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="font-headline text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Trusted & Secure
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Your data is protected with enterprise-grade security. FIRA is built on Google Firebase with end-to-end encryption for all communications.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { label: 'End-to-End Encrypted', sub: 'Chat & Video Calls' },
              { label: 'Verified Employers', sub: 'Trusted Companies Only' },
              { label: 'GDPR Compliant', sub: 'Data Privacy Protected' },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border">
                <p className="font-semibold text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to Go Global?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join FIRA today and take the first step toward your international career.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/favicon.ico"
              alt="FIRA logo"
              width={24}
              height={24}
              className="rounded-md"
            />
            <span className="font-headline font-bold text-primary">FIRA</span>
            <span className="text-sm text-muted-foreground">
              — Fil International Recruitment Agency
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/privacy-policy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
