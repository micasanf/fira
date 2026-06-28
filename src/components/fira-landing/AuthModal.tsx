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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// ── Google "G" logo (official 4-color mark) ──────────────────
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ── Reusable "Continue with Google" button ───────────────────
function GoogleButton({
  loading,
  onClick,
  disabled,
}: {
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <GoogleIcon className="size-4" />
          Continue with Google
        </>
      )}
    </Button>
  );
}

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
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // Google OAuth loading state (shared by both tabs)
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Google OAuth sign-in (used by both Sign In and Sign Up tabs) ──
  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect back to the current site after Google completes.
          // The @supabase/ssr middleware exchanges the code for a session
          // and the user lands on /dashboard (handled by the redirect URL).
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (oauthError) throw oauthError;
      // The browser will redirect to Google's consent screen, then back here.
      // No further action needed in this component — AuthContext's
      // onAuthStateChange listener picks up the new session.
    } catch (err: any) {
      const raw = err?.message || 'Google sign-in failed. Please try again.';
      let friendly = raw;
      if (/provider.*not enabled|disabled/i.test(raw)) {
        friendly =
          'Google sign-in is not enabled. Please contact support or use email/password instead.';
      } else if (/redirect.*not allowed|redirect_uri_mismatch/i.test(raw)) {
        friendly =
          'Google sign-in redirect URL is not configured. Please contact support.';
      } else if (/popup.*closed|cancelled/i.test(raw)) {
        friendly = 'Google sign-in was cancelled.';
      }
      toast({
        title: 'Google Sign-In Failed',
        description: friendly,
        variant: 'destructive',
      });
      setGoogleLoading(false);
    }
  }, [toast]);

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
      if (!agreeToTerms) {
        setRegisterError('Please accept the Terms of Service and Privacy Policy to create your account.');
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

        // Email confirmation required: Supabase returns either (a) a user but no
        // session, or (b) nothing at all (when OTP confirmation is enabled). In
        // both cases the account has been created in auth.users — the user just
        // needs to click the link in the confirmation email before they can sign in.
        if (!data.session) {
          toast({
            title: 'Account created — check your email',
            description:
              'We sent a verification link to ' +
              registerForm.email +
              '. Click it to activate your account, then sign in.',
          });
          setRegisterForm({ fullName: '', email: '', password: '', confirmPassword: '' });
          setAgreeToTerms(false);
          closeAuthModal();
          // Re-open on the Sign In tab so the user can sign in after confirming.
          openAuthModal('login');
          return;
        }

        // Session exists (email confirmation disabled) — proceed to the app.
        toast({
          title: 'Account created!',
          description: 'Welcome to FIRA!',
        });
        setRegisterForm({ fullName: '', email: '', password: '', confirmPassword: '' });
        setAgreeToTerms(false);
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
    [registerForm, agreeToTerms, closeAuthModal, toast, router, openAuthModal]
  );

  const switchToTab = useCallback(
    (tab: 'login' | 'register') => {
      setLoginError('');
      setRegisterError('');
      openAuthModal(tab);
    },
    [openAuthModal]
  );

  // Helper to navigate to /terms or /privacy-policy (closes the modal first)
  const goToPage = useCallback(
    (path: string) => {
      closeAuthModal();
      router.push(path);
    },
    [closeAuthModal, router]
  );

  return (
    <Dialog open={showAuthModal} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

              {/* Divider + Google */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-2 text-xs text-muted-foreground uppercase tracking-wider">
                    or continue with
                  </span>
                </div>
              </div>

              <GoogleButton
                loading={googleLoading}
                onClick={handleGoogleSignIn}
                disabled={loginLoading}
              />

              <p className="text-center text-sm text-muted-foreground pt-1">
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

              {/* Terms & Conditions agreement */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <Checkbox
                    id="agree-terms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="agree-terms" className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
                    I agree to FIRA&apos;s{' '}
                    <button
                      type="button"
                      onClick={() => goToPage('/terms')}
                      className="font-medium text-[#0078D7] hover:text-[#005A9E] underline"
                    >
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={() => goToPage('/privacy-policy')}
                      className="font-medium text-[#0078D7] hover:text-[#005A9E] underline"
                    >
                      Privacy Policy
                    </button>
                    , and I consent to the processing of my personal data for recruitment purposes in accordance with the Philippine Data Privacy Act of 2012.
                  </Label>
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
                disabled={registerLoading || !agreeToTerms}
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

              {/* Divider + Google */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-2 text-xs text-muted-foreground uppercase tracking-wider">
                    or sign up with
                  </span>
                </div>
              </div>

              <GoogleButton
                loading={googleLoading}
                onClick={handleGoogleSignIn}
                disabled={registerLoading}
              />

              <p className="text-center text-xs text-muted-foreground pt-1">
                By continuing with Google, you agree to FIRA&apos;s{' '}
                <button
                  type="button"
                  onClick={() => goToPage('/terms')}
                  className="font-medium text-[#0078D7] hover:text-[#005A9E] underline"
                >
                  Terms
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => goToPage('/privacy-policy')}
                  className="font-medium text-[#0078D7] hover:text-[#005A9E] underline"
                >
                  Privacy Policy
                </button>
                .
              </p>

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
