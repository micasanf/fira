"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  UserPlus,
  LogIn,
  Globe,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAuthModalStore } from '@/stores/auth-modal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// ── Password strength ────────────────────────────────────────
function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: '', width: '0%' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;
  switch (score) {
    case 0:
    case 1:
      return { score, label: 'Weak', color: 'bg-red-500', width: '20%' };
    case 2:
      return { score, label: 'Fair', color: 'bg-yellow-500', width: '40%' };
    case 3:
      return { score, label: 'Good', color: 'bg-yellow-500', width: '60%' };
    case 4:
      return { score, label: 'Strong', color: 'bg-green-500', width: '80%' };
    case 5:
      return { score, label: 'Very Strong', color: 'bg-green-500', width: '100%' };
    default:
      return { score: 0, label: '', color: '', width: '0%' };
  }
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="space-y-1.5" role="status" aria-live="polite">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: strength.width }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`h-full rounded-full ${strength.color}`}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength:{' '}
        <span className={strength.score >= 3 ? 'font-medium text-green-600' : 'font-medium text-muted-foreground'}>
          {strength.label}
        </span>
      </p>
    </div>
  );
}

export default function AuthModal() {
  const { showAuthModal, closeAuthModal, authModalTab, openAuthModal } = useAuthModalStore();
  const { toast } = useToast();
  const router = useRouter();

  // Login form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      if (!loginForm.email.trim()) {
        setLoginError('Please enter your email address.');
        return;
      }
      if (!loginForm.password) {
        setLoginError('Please enter your password.');
        return;
      }
      setLoginLoading(true);
      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: loginForm.email,
          password: loginForm.password,
        });
        if (authError) throw authError;

        toast({
          title: 'Welcome back!',
          description: `Signed in as ${data.user.email}`,
        });
        setLoginForm({ email: '', password: '', rememberMe: false });
        closeAuthModal();

        // Fetch role for redirect
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
        if (profile?.role === 'admin') router.push('/admin');
        else router.push('/dashboard');
      } catch (err: any) {
        const raw = err?.message || 'Login failed. Please try again.';
        let friendly = raw;
        if (/invalid login credentials/i.test(raw)) {
          friendly = 'Invalid email or password. Please try again.';
        } else if (/email not confirmed/i.test(raw)) {
          friendly = 'Please confirm your email address before signing in. Check your inbox for the verification link.';
        } else if (/rate limit|too many/i.test(raw)) {
          friendly = 'Too many login attempts. Please wait a moment and try again.';
        }
        setLoginError(friendly);
      } finally {
        setLoginLoading(false);
      }
    },
    [loginForm, closeAuthModal, toast, router]
  );

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setRegisterError('');
      if (!registerForm.fullName.trim()) {
        setRegisterError('Please enter your full name.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
        setRegisterError('Please enter a valid email address.');
        return;
      }
      if (registerForm.password.length < 6) {
        setRegisterError('Password must be at least 6 characters long.');
        return;
      }
      if (registerForm.password !== registerForm.confirmPassword) {
        setRegisterError('Passwords do not match. Please re-enter your password to confirm.');
        return;
      }
      setRegisterLoading(true);
      try {
        const { data, error: authError } = await supabase.auth.signUp({
          email: registerForm.email,
          password: registerForm.password,
          options: {
            data: {
              full_name: registerForm.fullName,
              role: 'employee',
            },
          },
        });
        if (authError) throw authError;
        if (!data.user) throw new Error('Failed to create account. Please try again.');

        // Email confirmation required (no session)
        if (!data.session) {
          toast({
            title: 'Verify your email',
            description: 'We sent a confirmation link to your inbox. Click it to activate your account.',
          });
          closeAuthModal();
          router.push('/login');
          return;
        }

        toast({
          title: 'Account created!',
          description: 'Welcome to FIRA!',
        });
        setRegisterForm({ fullName: '', email: '', password: '', confirmPassword: '' });
        closeAuthModal();
        router.push('/dashboard');
      } catch (err: any) {
        const raw = err?.message || 'Registration failed. Please try again.';
        let friendly = raw;
        if (/already registered/i.test(raw)) {
          friendly = 'An account with this email already exists. Try signing in instead.';
        } else if (/rate limit|too many|email rate limit/i.test(raw)) {
          friendly = 'Too many signup attempts. Please wait a moment and try again.';
        } else if (/weak|password/i.test(raw) && /at least/i.test(raw)) {
          friendly = 'Password is too weak. Use at least 6 characters.';
        }
        setRegisterError(friendly);
      } finally {
        setRegisterLoading(false);
      }
    },
    [registerForm, closeAuthModal, toast, router]
  );

  const switchToTab = useCallback(
    (tab: 'login' | 'register') => {
      setLoginError('');
      setRegisterError('');
      openAuthModal(tab);
    },
    [openAuthModal]
  );

  return (
    <Dialog open={showAuthModal} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#0078D7]">
              <Globe className="size-4 text-white" />
            </div>
            Welcome to FIRA
          </DialogTitle>
          <DialogDescription>
            Your gateway to international career opportunities
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={authModalTab}
          onValueChange={(val) => switchToTab(val as 'login' | 'register')}
          className="mt-2"
        >
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1 gap-1.5">
              <LogIn className="size-3.5" />
              Sign In
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1 gap-1.5">
              <UserPlus className="size-3.5" />
              Sign Up
            </TabsTrigger>
          </TabsList>

          {/* ========== LOGIN TAB ========== */}
          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="pl-9 pr-9"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded-sm"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={loginForm.rememberMe}
                    onCheckedChange={(checked) =>
                      setLoginForm((prev) => ({ ...prev, rememberMe: checked === true }))
                    }
                  />
                  <Label htmlFor="remember-me" className="text-sm cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeAuthModal();
                    router.push('/forgot-password');
                  }}
                  className="text-sm font-medium text-[#0078D7] hover:text-[#005A9E] transition-colors rounded-sm"
                >
                  Forgot Password?
                </button>
              </div>

              <AnimatePresence>
                {loginError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700 whitespace-pre-line">{loginError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                className="w-full bg-[#0078D7] font-semibold hover:bg-[#005A9E]"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="size-4" />
                    Sign In
                  </>
                )}
              </Button>

              <Separator />
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchToTab('register')}
                  className="font-medium text-[#0078D7] hover:text-[#005A9E] transition-colors rounded-sm"
                >
                  Sign Up
                </button>
              </p>
            </form>
          </TabsContent>

          {/* ========== REGISTER TAB ========== */}
          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} noValidate className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name" className="text-sm font-medium">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={registerForm.fullName}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="pl-9"
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="pl-9 pr-9"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded-sm"
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={registerForm.password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-9 pr-9"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded-sm"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {registerError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700 whitespace-pre-line">{registerError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                className="w-full bg-[#0078D7] font-semibold hover:bg-[#005A9E]"
                disabled={registerLoading}
              >
                {registerLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    Create Account
                  </>
                )}
              </Button>

              <Separator />
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchToTab('login')}
                  className="font-medium text-[#0078D7] hover:text-[#005A9E] transition-colors rounded-sm"
                >
                  Sign In
                </button>
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
