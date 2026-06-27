"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, User, LogOut, Briefcase, Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { useAuthModalStore } from '@/stores/auth-modal';
import { supabase } from '@/lib/supabase';

const BRAND = { blue: '#0078D7', darkBlue: '#005A9E', deepestBlue: '#003D6B', gold: '#FFD700', goldDark: '#C5A600' } as const;

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Browse Jobs', href: '/opportunities' },
  { label: 'About Us', href: '/#about' },
  { label: 'FAQ', href: '/#faq' },
];

function getRoleLabel(role: string | null): string {
  switch (role) {
    case 'employee': return 'Job Seeker';
    case 'employer': return 'Employer';
    case 'admin': return 'Admin';
    default: return 'Member';
  }
}

function FiraLogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10 6L3 16L10 26" stroke={BRAND.blue} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 10L23 16L16 22" stroke={BRAND.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="27" cy="16" r="2.5" fill={BRAND.blue} />
    </svg>
  );
}

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-[5px] w-6 h-6">
      <div className="block h-[2px] rounded-full bg-[#005A9E] transition-all duration-300" style={{ width: isOpen ? '20px' : '18px', transform: isOpen ? 'translateY(3.5px) rotate(45deg)' : 'none' }} />
      <div className="block h-[2px] rounded-full bg-[#005A9E] transition-all duration-300" style={{ width: '18px', opacity: isOpen ? 0 : 1, transform: isOpen ? 'scaleX(0)' : 'none' }} />
      <div className="block h-[2px] rounded-full bg-[#005A9E] transition-all duration-300" style={{ width: isOpen ? '20px' : '12px', transform: isOpen ? 'translateY(-3.5px) rotate(-45deg)' : 'none', transitionDelay: isOpen ? '0.05s' : '0s' }} />
    </div>
  );
}

function NavItem({ label, href, isActive, onClick }: { label: string; href: string; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`group relative px-4 py-2 text-[13px] font-semibold tracking-[0.08em] uppercase transition-colors duration-200 rounded-md ${isActive ? 'text-[#0078D7]' : 'text-[#475569] hover:text-[#0078D7]'}`}>
      {label}
      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-full transition-all duration-300 ease-out ${isActive ? 'w-6 bg-[#FFD700] shadow-[0_0_6px_rgba(255,215,0,0.4)]' : 'w-0 bg-[#0078D7] group-hover:w-5'}`} />
    </button>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading } = useAuth();
  const { openAuthModal } = useAuthModalStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAuthenticated = !!user;

  const handleNav = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('/#')) {
      const id = href.slice(2);
      if (pathname === '/') {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        router.push('/');
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    } else {
      router.push(href);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push('/');
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const dashboardRoute = role === 'admin' ? '/admin' : role === 'employer' ? '/employer/dashboard' : '/dashboard';

  return (
    <>
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      <header className={`sticky top-0 z-50 w-full transition-all duration-300 ease-out ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]' : 'bg-white/60 backdrop-blur-sm'}`}>
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <button onClick={() => handleNav('/')} className="flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80 rounded-lg" aria-label="FIRA — Home">
            <FiraLogoMark size={36} />
            <div className="flex flex-col leading-none">
              <span className="text-[22px] font-extrabold tracking-[-0.02em] text-[#005A9E]">FIRA</span>
              <span className="hidden text-[9px] font-medium tracking-[0.06em] uppercase text-[#0078D7]/50 sm:block">Recruitment Agency</span>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <NavItem key={link.label} label={link.label} href={link.href} isActive={pathname === link.href} onClick={() => handleNav(link.href)} />
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Auth Buttons (not logged in) */}
            {!isAuthenticated && !loading && (
              <div className="hidden items-center gap-2.5 sm:flex">
                <Button variant="ghost" size="sm" onClick={() => openAuthModal('login')}
                  className="rounded-full border border-[#0078D7]/20 px-5 text-[13px] font-semibold tracking-wide text-[#0078D7] hover:bg-[#0078D7]/5 hover:border-[#0078D7]/30 transition-all">
                  Sign In
                </Button>
                <Button size="sm" onClick={() => openAuthModal('register')}
                  className="rounded-full px-5 text-[13px] font-semibold tracking-wide text-white shadow-md shadow-[#0078D7]/20 hover:shadow-lg transition-all"
                  style={{ background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.darkBlue} 100%)` }}>
                  Sign Up
                </Button>
              </div>
            )}

            {/* User Dropdown (logged in) */}
            {isAuthenticated && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-0.5 pr-2.5 transition-all hover:bg-[#0078D7]/5 rounded-lg">
                    <Avatar className="size-8 ring-2 ring-[#FFD700] ring-offset-1">
                      <AvatarFallback className="text-xs font-bold text-white" style={{ backgroundColor: BRAND.darkBlue }}>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[110px] truncate text-sm font-medium text-[#334155] lg:block">{user.displayName}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-semibold text-[#0F172A]">{user.displayName}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium" style={{ backgroundColor: '#0078D715', color: BRAND.blue }}>{getRoleLabel(role)}</Badge>
                        <p className="text-xs text-[#94A3B8] truncate">{user.email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push(dashboardRoute)}>
                      <LayoutDashboard className="size-4 text-[#64748B]" /><span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(role === 'employer' ? '/employer/profile' : '/profile')}>
                      <User className="size-4 text-[#64748B]" /><span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/opportunities')}>
                      <Briefcase className="size-4 text-[#64748B]" /><span>Browse Jobs</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="size-4 text-[#64748B]" /><span>Settings</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} variant="destructive" className="text-red-500 focus:text-red-500">
                    <LogOut className="size-4" /><span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:bg-[#0078D7]/5 md:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
                  <HamburgerIcon isOpen={mobileOpen} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0" style={{ backgroundColor: BRAND.deepestBlue }}>
                <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <FiraLogoMark size={28} />
                    <span className="text-lg font-extrabold text-white tracking-[-0.01em]">FIRA</span>
                  </div>
                  <SheetClose asChild>
                    <button className="flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-white/10 text-white/70 text-xl" aria-label="Close menu">✕</button>
                  </SheetClose>
                </div>
                <ScrollArea className="h-[calc(100vh-76px)]">
                  <div className="flex flex-col px-3 py-4 gap-1">
                    <nav className="flex flex-col gap-0.5">
                      {navLinks.map((link) => (
                        <SheetClose asChild key={link.label}>
                          <button onClick={() => handleNav(link.href)}
                            className={`flex items-center gap-4 w-full rounded-lg px-4 py-4 text-[15px] font-semibold transition-all ${pathname === link.href ? 'text-[#FFD700] bg-white/5 border-l-[3px] border-[#FFD700]' : 'text-white/70 hover:text-white hover:bg-white/5 border-l-[3px] border-transparent'}`}>
                            {link.label}
                          </button>
                        </SheetClose>
                      ))}
                    </nav>
                    <Separator className="my-4 bg-white/10" />
                    {isAuthenticated && user ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 mb-2">
                          <Avatar className="size-11" style={{ boxShadow: `0 0 0 2px ${BRAND.gold}` }}>
                            <AvatarFallback className="text-xs font-bold text-white" style={{ backgroundColor: BRAND.darkBlue }}>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
                            <p className="text-xs text-white/40 truncate">{user.email}</p>
                          </div>
                        </div>
                        <Separator className="my-2 bg-white/10" />
                        <SheetClose asChild>
                          <button onClick={() => router.push(dashboardRoute)} className="flex items-center gap-3.5 w-full rounded-lg px-4 py-4 text-[14px] font-medium text-white/60 hover:text-white hover:bg-white/5 border-l-[3px] border-transparent">
                            <LayoutDashboard className="size-[18px]" />Dashboard
                          </button>
                        </SheetClose>
                        <SheetClose asChild>
                          <button onClick={() => router.push('/profile')} className="flex items-center gap-3.5 w-full rounded-lg px-4 py-4 text-[14px] font-medium text-white/60 hover:text-white hover:bg-white/5 border-l-[3px] border-transparent">
                            <User className="size-[18px]" />Profile
                          </button>
                        </SheetClose>
                        <SheetClose asChild>
                          <button onClick={handleLogout} className="flex items-center gap-3.5 w-full rounded-lg px-4 py-4 text-[14px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 border-l-[3px] border-transparent">
                            <LogOut className="size-[18px]" />Logout
                          </button>
                        </SheetClose>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 px-3 mt-1">
                        <SheetClose asChild>
                          <Button variant="outline" className="w-full rounded-full border-white/20 bg-transparent text-white text-[14px] font-semibold hover:bg-white/10 hover:text-white py-5" onClick={() => openAuthModal('login')}>Sign In</Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button className="w-full rounded-full text-[14px] font-semibold text-[#003D6B] shadow-lg py-5 hover:opacity-90"
                            style={{ background: `linear-gradient(135deg, ${BRAND.gold} 0%, ${BRAND.goldDark} 100%)` }}
                            onClick={() => openAuthModal('register')}>Sign Up</Button>
                        </SheetClose>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
