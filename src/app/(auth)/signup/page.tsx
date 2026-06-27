"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AnimatedCharacters } from "@/components/ui/animated-characters";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Checkbox } from "@/components/ui/checkbox";

// Role is no longer chosen by the user — everyone signs up as a Job Seeker.
// Admin role is still auto-assigned via NEXT_PUBLIC_ADMIN_EMAILS for whitelisted addresses.
const DEFAULT_ROLE = "employee" as const;

const signupSchema = z.object({
  fullName: z.string().min(2, { message: "Please enter your full name." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // When the project requires email confirmation, we flip this to true and
  // render a success panel instead of trying to push into the authenticated app.
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  const password = form.watch("password");

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    setError("");
    try {
      // Determine admin status from env whitelist (server-side check would be ideal,
      // but this mirrors the original flow and is fine for redirect routing only).
      const adminEmails = (
        process.env.NEXT_PUBLIC_ADMIN_EMAILS || "admin@fira.com.ph"
      )
        .split(",")
        .map((e) => e.trim().toLowerCase());
      const isAdmin = adminEmails.includes(values.email.toLowerCase());
      const role = isAdmin ? "admin" : DEFAULT_ROLE;

      // Create auth user. We pass `full_name` AND `role` in user_metadata so the
      // `handle_new_user` DB trigger (supabase/migration.sql) populates
      // public.users / public.public_profiles with the correct role on its own.
      // We deliberately do NOT manually INSERT into those tables afterwards —
      // doing so caused a duplicate-PK violation against the trigger's insert.
      const { data, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            role,
          },
        },
      });

      if (authError) throw authError;

      const user = data.user;
      if (!user) throw new Error("Failed to create account. Please try again.");

      // Email confirmation ON (Supabase default for new projects):
      // signUp succeeds and returns a user, but no active session. We can't
      // push them into the protected app — middleware would bounce them back
      // to /login. Instead, show a clear "check your email" state.
      if (!data.session) {
        setNeedsEmailConfirmation(true);
        toast({
          title: "Verify your email",
          description:
            "We sent a confirmation link to your inbox. Click it to activate your account.",
        });
        return;
      }

      // Session exists (email confirmation disabled) — proceed to the app.
      toast({
        title: "Account Created",
        description:
          "Your account has been successfully created. You are now logged in.",
      });

      if (role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      const raw = err?.message || "Something went wrong. Please try again.";
      // Translate the most common Supabase errors into friendlier copy.
      let friendly = raw;
      if (/already registered/i.test(raw)) {
        friendly =
          "An account with this email already exists. Try signing in instead.";
      } else if (/rate limit|too many|after \d+ seconds/i.test(raw)) {
        friendly =
          "Too many signup attempts. Please wait a moment and try again.";
      } else if (/password/i.test(raw) && /weak|short|at least/i.test(raw)) {
        friendly = "Password is too weak. Use at least 6 characters.";
      }
      setError(friendly);
      toast({
        title: "Signup Failed",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Success state shown when the project requires email confirmation.
  if (needsEmailConfirmation) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 dark:from-white/90 dark:via-white/80 dark:to-white/70 p-12 text-white dark:text-gray-900">
          <div className="relative z-20">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Image
                src="/favicon.ico"
                alt="FIRA logo"
                width={32}
                height={32}
                className="bg-white/10 backdrop-blur-sm p-1 rounded-lg"
              />
              <span>FIRA</span>
            </Link>
          </div>
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        </div>

        <div className="flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-[420px] text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Eye className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Check your email
              </h1>
              <p className="text-muted-foreground text-sm">
                We sent a verification link to your inbox. Click it to activate
                your FIRA account, then sign in.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 px-6 text-base font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Continue to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen overflow-hidden grid lg:grid-cols-2">
      {/* Left Content Section with Animated Characters */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 dark:from-white/90 dark:via-white/80 dark:to-white/70 p-12 text-white dark:text-gray-900">
        <div className="relative z-20">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Image
              src="/favicon.ico"
              alt="FIRA logo"
              width={32}
              height={32}
              className="bg-white/10 backdrop-blur-sm p-1 rounded-lg"
            />
            <span>FIRA</span>
          </Link>
        </div>

        <div className="relative z-20 flex items-end justify-center h-[500px]">
          <AnimatedCharacters
            isTyping={isTyping}
            showPassword={showPassword}
            passwordLength={password.length}
          />
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm text-gray-600 dark:text-gray-700">
          <a
            href="/privacy-policy"
            className="hover:text-gray-900 dark:hover:text-black transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            className="hover:text-gray-900 dark:hover:text-black transition-colors"
          >
            Terms of Service
          </a>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute top-1/4 right-1/4 size-64 bg-gray-400/20 dark:bg-gray-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-96 bg-gray-300/20 dark:bg-gray-200/20 rounded-full blur-3xl" />
      </div>

      {/* Right Signup Section */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12">
            <Image
              src="/favicon.ico"
              alt="FIRA logo"
              width={32}
              height={32}
              className="dark:bg-white dark:p-1 dark:rounded-md"
            />
            <span>FIRA</span>
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Create an account
            </h1>
            <p className="text-muted-foreground text-sm">
              Join FIRA — Connecting Filipino Talent to the World
            </p>
          </div>

          {/* Signup Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                autoComplete="off"
                {...form.register("fullName")}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                className="h-12 bg-background border-border/60 focus:border-primary"
              />
              {form.formState.errors.fullName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="off"
                {...form.register("email")}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                className="h-12 bg-background border-border/60 focus:border-primary"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...form.register("password")}
                  className="h-12 pr-10 bg-background border-border/60 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="privacy-terms" required />
              <Label
                htmlFor="privacy-terms"
                className="text-sm font-normal cursor-pointer"
              >
                I agree to the
                <Link
                  href="/privacy-policy"
                  className="text-primary underline mx-1"
                >
                  Privacy Policy
                </Link>
                and
                <Link href="/terms" className="text-primary underline mx-1">
                  Terms of Service
                </Link>
              </Label>
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg">
                {error}
              </div>
            )}

            <InteractiveHoverButton
              type="submit"
              text={isLoading ? "Creating account..." : "Create Account"}
              className="w-full h-12 text-base font-medium"
              disabled={isLoading}
            />
          </form>

          {/* Sign In Link */}
          <div className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-foreground font-medium hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
