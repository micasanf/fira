"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { generateProfileSummary } from "@/ai/flows/generate-profile-summary";
import { enhanceText } from "@/ai/flows/enhance-text";
import { parseResume } from "@/ai/flows/parse-resume";
import { ComprehensiveATSScorer } from "@/lib/comprehensiveAtsScorer";
import {
  Bot,
  Loader2,
  Edit,
  Upload,
  X,
  Sparkles,
  FileText,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUploader } from "@/components/ui/avatar-uploader";
import { LumaSpin } from "@/components/ui/luma-spin";

// ------------------------------------------------------------------
// Form schema — kept aligned with the Supabase `users` / `public_profiles`
// snake_case columns. `skills` is edited as a comma-separated string and
// converted to TEXT[] when persisted.
// ------------------------------------------------------------------
const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  headline: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  skills: z.string().optional(), // comma-separated
  experience: z.string().optional(),
  education: z.string().optional(),
  portfolioLink: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().url().optional().or(z.literal("")),
  github: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function skillsArrayToText(arr: string[] | null | undefined): string {
  if (!arr || !Array.isArray(arr)) return "";
  return arr.join(", ");
}

function skillsTextToArray(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfileEditPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [isPending, startTransition] = useTransition();
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Edit state management
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingProfessional, setIsEditingProfessional] = useState(false);

  // ATS Score Checker state
  const [atsResumeText, setAtsResumeText] = useState("");
  const [atsResumeFile, setAtsResumeFile] = useState<File | null>(null);
  const [atsSuggestions, setAtsSuggestions] = useState<string>("");
  const [atsJobDesc, setAtsJobDesc] = useState("");
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsConfidence, setAtsConfidence] = useState<
    "High" | "Medium" | "Low" | null
  >(null);
  const [atsLoading, setAtsLoading] = useState(false);

  const resumeInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      firstName: "",
      lastName: "",
      headline: "",
      phone: "",
      location: "",
      bio: "",
      skills: "",
      experience: "",
      education: "",
      portfolioLink: "",
      linkedin: "",
      github: "",
      website: "",
    },
  });

  // ---------------------------------------------------------------
  // Load profile from Supabase
  // ---------------------------------------------------------------
  const loadProfile = useCallback(async () => {
    if (!user) return;
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Could not load your profile.",
          variant: "destructive",
        });
      } else if (data) {
        form.reset({
          displayName: data.display_name ?? "",
          firstName: data.first_name ?? "",
          lastName: data.last_name ?? "",
          headline: data.headline ?? "",
          phone: data.phone ?? "",
          location: data.location ?? "",
          bio: data.bio ?? "",
          skills: skillsArrayToText(data.skills),
          experience: data.experience ?? data.employment_history ?? "",
          education: data.education ?? "",
          portfolioLink: data.portfolio_link ?? "",
          linkedin: data.linkedin ?? "",
          github: data.github ?? "",
          website: data.website ?? "",
        });
        setPhotoUrl(data.photo_url ?? user.photoURL ?? null);
      }
    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setIsFetching(false);
    }
  }, [user, form, toast]);

  useEffect(() => {
    if (user) loadProfile();
  }, [user, loadProfile]);

  // ---------------------------------------------------------------
  // Persist profile to BOTH `users` and `public_profiles`
  // ---------------------------------------------------------------
  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const skillsArray = skillsTextToArray(values.skills || "");
      const now = new Date().toISOString();
      const newDisplayName =
        values.displayName || `${values.firstName} ${values.lastName}`.trim();

      // ----- users table -----
      const usersPayload = {
        id: user.id,
        email: user.email ?? "",
        display_name: newDisplayName,
        first_name: values.firstName,
        last_name: values.lastName,
        headline: values.headline ?? null,
        phone: values.phone ?? null,
        location: values.location ?? null,
        bio: values.bio ?? null,
        skills: skillsArray,
        experience: values.experience ?? null,
        employment_history: values.experience ?? null,
        education: values.education ?? null,
        portfolio_link: values.portfolioLink || null,
        linkedin: values.linkedin || null,
        github: values.github || null,
        website: values.website || null,
        photo_url: photoUrl,
        updated_at: now,
      };

      const { error: usersError } = await supabase
        .from("users")
        .upsert(usersPayload, { onConflict: "id" });

      if (usersError) throw usersError;

      // ----- public_profiles table -----
      const publicPayload = {
        id: user.id,
        display_name: newDisplayName,
        first_name: values.firstName,
        last_name: values.lastName,
        headline: values.headline ?? null,
        photo_url: photoUrl,
        location: values.location ?? null,
        bio: values.bio ?? null,
        skills: skillsArray,
        education: values.education ?? null,
        employment_history: values.experience ?? null,
        portfolio_link: values.portfolioLink || null,
        linkedin: values.linkedin || null,
        github: values.github || null,
        website: values.website || null,
        updated_at: now,
      };

      const { error: publicError } = await supabase
        .from("public_profiles")
        .upsert(publicPayload, { onConflict: "id" });

      if (publicError) {
        // Don't fail the whole save if only the public profile fails
        console.error("public_profiles upsert error:", publicError);
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });

      setIsEditingPersonal(false);
      setIsEditingProfessional(false);
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: "There was an error updating your profile.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------
  // AI Summary (wrapped in try/catch — may fail without GenAI key)
  // ---------------------------------------------------------------
  const onGenerateSummary = () => {
    const values = form.getValues();
    startTransition(async () => {
      try {
        const { summary } = await generateProfileSummary({
          education: values.education || "",
          skills: values.skills || "",
          interests: "",
          careerGoals: values.experience || "",
        });
        setSummary(summary);
        toast({
          title: "Summary Generated",
          description: "Your AI-powered profile summary is ready.",
        });
      } catch (error) {
        console.error("AI summary failed:", error);
        toast({
          title: "AI Unavailable",
          description:
            "Could not generate an AI summary right now. Try again later.",
          variant: "destructive",
        });
      }
    });
  };

  // ---------------------------------------------------------------
  // Enhance text (wrapped in try/catch)
  // ---------------------------------------------------------------
  const handleEnhanceText = (
    fieldName: keyof ProfileFormValues,
    context: string
  ) => {
    startTransition(async () => {
      const currentValue = form.getValues(fieldName);
      if (typeof currentValue !== "string" || !currentValue.trim()) {
        toast({
          title: "Cannot Enhance",
          description: "Field must not be empty.",
          variant: "destructive",
        });
        return;
      }
      try {
        const { enhancedText } = await enhanceText({
          text: currentValue,
          context,
        });
        form.setValue(fieldName, enhancedText);
        toast({
          title: "Content Enhanced",
          description: "The content has been improved by AI.",
        });
      } catch (error) {
        console.error("Enhancement failed:", error);
        toast({
          title: "AI Unavailable",
          description: "Could not enhance text at this time.",
          variant: "destructive",
        });
      }
    });
  };

  // ---------------------------------------------------------------
  // Parse resume (wrapped in try/catch)
  // ---------------------------------------------------------------
  const handleResumeParse = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const resumeDataUri = e.target?.result as string;
          if (!resumeDataUri) return;
          toast({
            title: "Parsing Resume...",
            description:
              "AI is extracting information from your resume. This may take a moment.",
          });
          try {
            const parsedData = await parseResume({ resumeDataUri });
            form.setValue("education", parsedData.education);
            form.setValue("skills", parsedData.skills);
            form.setValue("experience", parsedData.employmentHistory);
            toast({
              title: "Resume Parsed",
              description:
                "Your profile has been updated with information from your resume.",
            });
          } catch (err) {
            console.error("AI parse failed:", err);
            toast({
              title: "AI Unavailable",
              description:
                "Could not parse the resume with AI right now. Try again later.",
              variant: "destructive",
            });
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Resume parsing failed:", error);
        toast({
          title: "Error",
          description: "Could not read the resume file.",
          variant: "destructive",
        });
      }
    });
  };

  // ---------------------------------------------------------------
  // ATS Score (local-only, no AI dependency)
  // ---------------------------------------------------------------
  const handleAtsScore = () => {
    setAtsLoading(true);
    setAtsSuggestions("");
    setAtsConfidence(null);
    setAtsScore(null);

    const scoreAndSuggest = (resumeText: string) => {
      if (!resumeText.trim() || !atsJobDesc.trim()) {
        setAtsLoading(false);
        setAtsScore(null);
        setAtsSuggestions("Please provide both a resume and a job description.");
        return;
      }
      try {
        const scorer = new ComprehensiveATSScorer();
        const result = scorer.calculateComprehensiveScore(
          resumeText,
          atsJobDesc
        );
        setAtsScore(result.overallScore);
        setAtsConfidence(result.confidenceLevel);
        setAtsSuggestions(result.suggestions.join("\n"));
      } catch (e) {
        console.error("ATS scorer error:", e);
        setAtsSuggestions("Could not compute ATS score.");
      } finally {
        setAtsLoading(false);
      }
    };

    if (atsResumeFile) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fileText = (e.target?.result as string) || "";
          scoreAndSuggest(fileText);
        };
        reader.readAsText(atsResumeFile);
      } catch (err) {
        setAtsLoading(false);
        setAtsSuggestions("Could not read resume file.");
      }
    } else {
      if (!atsResumeText.trim() || !atsJobDesc.trim()) {
        setAtsLoading(false);
        setAtsScore(null);
        setAtsSuggestions(
          "Please provide both a resume and a job description."
        );
        return;
      }
      scoreAndSuggest(atsResumeText);
    }
  };

  // ---------------------------------------------------------------
  // Profile picture upload — uses Supabase Storage if available,
  // otherwise just updates the URL in the DB.
  // ---------------------------------------------------------------
  const handleAvatarUpload = async (file: File) => {
    if (!user) return { success: false };
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      let url: string;
      if (uploadError) {
        // Fallback: use a local object URL (not persisted across sessions)
        url = URL.createObjectURL(file);
      } else {
        const { data: pub } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        url = pub.publicUrl;
      }

      const now = new Date().toISOString();
      await supabase
        .from("users")
        .upsert(
          { id: user.id, photo_url: url, updated_at: now },
          { onConflict: "id" }
        );
      await supabase
        .from("public_profiles")
        .upsert(
          { id: user.id, photo_url: url, updated_at: now },
          { onConflict: "id" }
        );

      setPhotoUrl(url);
      toast({
        title: "Profile Picture Updated",
        description: "Your new picture has been saved.",
      });
      return { success: true };
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Error",
        description: "Failed to upload profile picture.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setUploading(false);
    }
  };

  // ---------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------
  const renderViewField = (
    label: string,
    value: string | undefined,
    className?: string
  ) => (
    <div className={className}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <p className="text-sm text-muted-foreground mt-1">
        {value || "Not provided"}
      </p>
    </div>
  );

  const renderSkillsView = (skills: string | undefined) => {
    const arr = skillsTextToArray(skills || "");
    if (arr.length === 0)
      return <p className="text-sm text-muted-foreground">No skills listed</p>;
    return (
      <div className="flex flex-wrap gap-2">
        {arr.map((skill, i) => (
          <Badge key={i} variant="secondary">
            {skill}
          </Badge>
        ))}
      </div>
    );
  };

  // ---------------------------------------------------------------
  // Loading / not-logged-in states
  // ---------------------------------------------------------------
  if (authLoading || isFetching) {
    return (
      <div className="container mx-auto flex justify-center items-center h-96">
        <LumaSpin />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Login Required</h1>
        <Button asChild>
          <Link href="/?auth=login">Login</Link>
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------
  const formValues = form.watch();
  const uploading = false; // placeholder; AvatarUploader manages its own state

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and career preferences.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          {/* ------------------------------------------------- */}
          {/* Personal Information                              */}
          {/* ------------------------------------------------- */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Personal Information</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditingPersonal ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                <AvatarUploader onUpload={handleAvatarUpload}>
                  <div className="relative cursor-pointer group">
                    <Avatar className="h-24 w-24 transition-opacity group-hover:opacity-75">
                      <AvatarImage
                        src={photoUrl || ""}
                        alt="Profile picture"
                      />
                      <AvatarFallback className="text-3xl">
                        {formValues.displayName
                          ? getInitials(formValues.displayName)
                          : user.displayName
                          ? getInitials(user.displayName)
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </AvatarUploader>
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-semibold">
                    {formValues.displayName || user.displayName}
                  </h2>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {isEditingPersonal ? (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="headline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Headline</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Senior Caregiver"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            A short tagline shown on your public profile.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="San Francisco, CA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about yourself..."
                              className="min-h-[120px] resize-y"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            A brief professional summary visible to employers.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEnhanceText("bio", "professional bio")}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Enhance with AI
                    </Button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="portfolioLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Portfolio Link (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://your-portfolio.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="linkedin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LinkedIn (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://linkedin.com/in/you"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="github"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GitHub (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://github.com/you"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Personal Website (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://your-site.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditingPersonal(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderViewField("Display Name", formValues.displayName)}
                    {renderViewField("Headline", formValues.headline)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderViewField("First Name", formValues.firstName)}
                    {renderViewField("Last Name", formValues.lastName)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderViewField("Phone", formValues.phone)}
                    {renderViewField("Location", formValues.location)}
                  </div>
                  {renderViewField("Bio", formValues.bio)}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderViewField("Portfolio Link", formValues.portfolioLink)}
                    {renderViewField("LinkedIn", formValues.linkedin)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderViewField("GitHub", formValues.github)}
                    {renderViewField("Website", formValues.website)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ------------------------------------------------- */}
          {/* Professional Details                              */}
          {/* ------------------------------------------------- */}
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Professional Details</CardTitle>
                  <CardDescription>
                    This information will be used to match you with
                    opportunities and pre-fill applications.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    setIsEditingProfessional(!isEditingProfessional)
                  }
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditingProfessional ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditingProfessional ? (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    {/* Resume parse */}
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Auto-fill from resume
                        </p>
                        <p className="text-xs text-muted-foreground">
                          AI extracts skills, education and experience.
                        </p>
                      </div>
                      <input
                        ref={resumeInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleResumeParse}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => resumeInputRef.current?.click()}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Resume
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name="skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skills</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="React, TypeScript, Node.js, ..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Comma-separated list of your skills.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Experience / Employment History</FormLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleEnhanceText(
                                  "experience",
                                  "employment history"
                                )
                              }
                              disabled={isPending}
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                              )}
                              Enhance
                            </Button>
                          </div>
                          <FormControl>
                            <Textarea
                              placeholder="Senior Engineer at Acme (2021-Present)..."
                              className="min-h-[120px] resize-y"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="education"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Education</FormLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleEnhanceText("education", "education")
                              }
                              disabled={isPending}
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                              )}
                              Enhance
                            </Button>
                          </div>
                          <FormControl>
                            <Textarea
                              placeholder="B.S. Computer Science, University of ..."
                              className="min-h-[120px] resize-y"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* AI Summary */}
                    <div className="rounded-2xl border border-border/60 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Bot className="h-4 w-4 text-primary" />
                            AI Profile Summary
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Generate a compelling narrative from your details.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={onGenerateSummary}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          Generate
                        </Button>
                      </div>
                      {summary && (
                        <div className="rounded-xl bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                          {summary}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditingProfessional(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Skills
                    </label>
                    <div className="mt-1">{renderSkillsView(formValues.skills)}</div>
                  </div>
                  {renderViewField("Experience", formValues.experience)}
                  {renderViewField("Education", formValues.education)}
                  {summary && (
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        AI Summary
                      </label>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {summary}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ------------------------------------------------- */}
          {/* ATS Score Checker                                 */}
          {/* ------------------------------------------------- */}
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>ATS Score Checker</CardTitle>
              <CardDescription>
                Paste your resume and a job description to estimate how well
                your resume matches.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resume Text</label>
                  <Textarea
                    value={atsResumeText}
                    onChange={(e) => setAtsResumeText(e.target.value)}
                    placeholder="Paste your resume text here..."
                    className="min-h-[160px] resize-y"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={(e) => setAtsResumeFile(e.target.files?.[0] || null)}
                      className="text-xs"
                    />
                    {atsResumeFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAtsResumeFile(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Description</label>
                  <Textarea
                    value={atsJobDesc}
                    onChange={(e) => setAtsJobDesc(e.target.value)}
                    placeholder="Paste the job description here..."
                    className="min-h-[160px] resize-y"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAtsScore}
                disabled={atsLoading}
              >
                {atsLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scoring...
                  </>
                ) : (
                  "Score My Resume"
                )}
              </Button>

              {atsScore !== null && (
                <div className="rounded-2xl border border-border/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Score</span>
                    <span className="text-2xl font-bold text-primary">
                      {atsScore}
                      <span className="text-sm text-muted-foreground">/100</span>
                    </span>
                  </div>
                  {atsConfidence && (
                    <p className="text-xs text-muted-foreground">
                      Confidence: <span className="font-medium">{atsConfidence}</span>
                    </p>
                  )}
                </div>
              )}

              {atsSuggestions && (
                <div className="rounded-2xl bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                  {atsSuggestions}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------------------------- */}
        {/* Sidebar (tips)                                    */}
        {/* ------------------------------------------------- */}
        <div className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base">Profile Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Complete your profile</span> — profiles with skills,
                experience and a headline get more views from recruiters.
              </p>
              <p>
                <span className="font-medium text-foreground">Use keywords</span> from the jobs you want in your
                skills and bio to improve ATS match scores.
              </p>
              <p>
                <span className="font-medium text-foreground">Keep it concise</span> — a tight 2-3 sentence bio
                beats a wall of text.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base">Need help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/opportunities">Browse Opportunities</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
