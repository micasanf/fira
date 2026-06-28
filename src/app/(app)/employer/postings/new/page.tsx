"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTransition } from "react";

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
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { enhanceText } from "@/ai/flows/enhance-text";
import { Bot } from "lucide-react";
import { SkillsInput } from "@/components/skills-input";

const postingSchema = z.object({
  title: z.string().min(1, "Job title is required."),
  companyOverview: z
    .string()
    .min(50, "Company overview must be at least 50 characters."),
  description: z
    .string()
    .min(50, "Job description must be at least 50 characters."),
  location: z.string().min(1, "Location is required."),
  rolesAndResponsibilities: z
    .string()
    .min(50, "Please list the roles and responsibilities."),
  skills: z.string().min(1, "Please list required skills."),
  education: z.string().min(1, "Education requirements are required."),
  experience: z.string().min(1, "Experience requirements are required."),
  preferredQualifications: z.string().optional(),
  compensationAndBenefits: z
    .string()
    .min(1, "Compensation and benefits are required."),
  applicationInstructions: z
    .string()
    .min(1, "Application instructions are required."),
  legalStatement: z.string().min(1, "Equal opportunity statement is required."),
  type: z.enum(
    ["Internship", "Volunteer", "Full-time", "Part-time", "Contract"],
    { required_error: "Please select a job type." }
  ),
  workingHours: z.string().optional(),
  travelRequirements: z.string().optional(),
});

type PostingFormValues = z.infer<typeof postingSchema>;

// Convert a comma-separated skills string into a TEXT[] for Supabase.
function skillsToArray(skills: string): string[] {
  if (!skills) return [];
  return skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function NewPostingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const form = useForm<PostingFormValues>({
    resolver: zodResolver(postingSchema),
    defaultValues: {
      title: "",
      companyOverview: "",
      description: "",
      location: "",
      rolesAndResponsibilities: "",
      skills: "",
      education: "",
      experience: "",
      preferredQualifications: "",
      compensationAndBenefits: "",
      applicationInstructions: "",
      legalStatement:
        "FIRA is an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all employees.",
      workingHours: "",
      travelRequirements: "",
    },
  });

  const onSubmit = async (values: PostingFormValues) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a posting.",
        variant: "destructive",
      });
      return;
    }

    const nowIso = new Date().toISOString();

    const insertPayload: Record<string, any> = {
      title: values.title,
      description: values.description,
      company_overview: values.companyOverview,
      location: values.location,
      roles_and_responsibilities: values.rolesAndResponsibilities,
      skills: skillsToArray(values.skills),
      education: values.education,
      experience: values.experience,
      preferred_qualifications: values.preferredQualifications
        ? [values.preferredQualifications]
        : [],
      compensation_and_benefits: values.compensationAndBenefits,
      application_instructions: values.applicationInstructions,
      legal_statement: values.legalStatement,
      type: values.type,
      job_type: values.type,
      working_hours: values.workingHours || null,
      travel_requirements: values.travelRequirements || null,
      employer_id: user.id,
      employer_name: user.displayName || user.email || "Employer",
      employer_photo_url: user.photoURL || null,
      status: "active",
      is_active: true,
      application_count: 0,
      views_count: 0,
      posted_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };

    try {
      const { data, error } = await supabase
        .from("opportunities")
        .insert(insertPayload)
        .select("id")
        .single();

      if (error) throw error;

      const newId = data?.id;

      toast({
        title: "Posting Created",
        description: "Your new job posting is now live.",
      });

      // Best-effort: notify matching candidates via AI flow. Wrapped in try/catch
      // because the AI flow may fail if the GenAI API key isn't configured.
      try {
        const { findMatchingCandidates } = await import(
          "@/ai/flows/find-matching-candidates"
        );
        const result: any = await findMatchingCandidates({
          opportunityId: newId,
        });
        const candidates = result?.candidates || [];
        if (candidates.length > 0) {
          toast({
            title: "Candidates Found",
            description: `${candidates.length} matching candidates were found.`,
          });
        } else {
          toast({
            title: "No Instant Matches",
            description:
              "No candidates with matching skills were found at this time.",
          });
        }
      } catch (matchError) {
        console.warn("Matching candidates flow skipped/failed:", matchError);
        toast({
          title: "Candidate Matching Unavailable",
          description:
            "The posting was created, but candidate matching is currently unavailable.",
        });
      }

      router.push("/employer/dashboard");
    } catch (error: any) {
      console.error("Error creating posting:", error);
      toast({
        title: "Error",
        description:
          error?.message || "There was an error creating the posting.",
        variant: "destructive",
      });
    }
  };

  const handleEnhanceText = (
    fieldName: keyof PostingFormValues,
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
          title: "AI Enhancement Unavailable",
          description:
            "Could not enhance text at this time. The AI service may be unavailable.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create New Posting</h1>
        <p className="text-muted-foreground">
          Fill out the details below to post a new opportunity.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Software Engineer Intern" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyOverview"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Overview</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea
                          placeholder="Briefly describe your company, its mission, values, and culture."
                          {...field}
                          rows={4}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleEnhanceText("companyOverview", "Company Overview")
                          }
                          disabled={isPending}
                          className="absolute bottom-2 right-2"
                        >
                          <Bot className="mr-2 h-4 w-4" />
                          {isPending ? "Enhancing..." : "Enhance"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>A brief introduction to your company.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea
                          placeholder="A concise overview of the role’s main purpose, including key responsibilities, tasks, and objectives."
                          {...field}
                          rows={6}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEnhanceText("description", "Job Description")}
                          disabled={isPending}
                          className="absolute bottom-2 right-2"
                        >
                          <Bot className="mr-2 h-4 w-4" />
                          {isPending ? "Enhancing..." : "Enhance"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., San Francisco, CA or Remote" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a job type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Internship">Internship</SelectItem>
                          <SelectItem value="Volunteer">Volunteer</SelectItem>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="rolesAndResponsibilities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles and Responsibilities</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea
                          placeholder="List the primary duties and expectations for the position..."
                          {...field}
                          rows={6}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleEnhanceText(
                              "rolesAndResponsibilities",
                              "Roles and Responsibilities"
                            )
                          }
                          disabled={isPending}
                          className="absolute bottom-2 right-2"
                        >
                          <Bot className="mr-2 h-4 w-4" />
                          {isPending ? "Enhancing..." : "Enhance"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>Use bullet points for clarity.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Qualifications & Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills</FormLabel>
                        <FormControl>
                          <SkillsInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="List hard and soft skills required for the role."
                          />
                        </FormControl>
                        <FormDescription>
                          Type skills and press comma, enter, or tab to add them as pills.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="education"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Education</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Bachelor's degree in Computer Science or equivalent"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 2+ years of experience in a similar role"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <FormField
                control={form.control}
                name="preferredQualifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Qualifications (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List any 'nice-to-have' skills or experience."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="compensationAndBenefits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compensation and Benefits</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the salary range, health benefits, perks, career growth opportunities..."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Providing a salary range is legally required in some locations.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicationInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain how applicants should apply, what materials are required (resume, cover letter, etc.), and any deadlines."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legalStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equal Opportunity and Legal Statements</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Include your company's EEO statement here."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Other Details</CardTitle>
                  <CardDescription>
                    Provide any additional relevant information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="workingHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Working Hours (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 9am - 5pm EST, Flexible" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="travelRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Travel Requirements (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Up to 10% domestic travel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" asChild>
                  <Link href="/employer/dashboard">Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Creating..." : "Create Posting"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
