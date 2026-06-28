"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

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
import { Loader2, Edit, Save, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const profileSchema = z.object({
  companyName: z.string().min(1, "Company name is required."),
  contactNumber: z.string().optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  companyOverview: z.string().min(1, "Company overview is required."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EmployerProfilePage() {
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      companyName: "",
      contactNumber: "",
      supportEmail: "",
      companyOverview: "",
    },
  });

  // Fetch the employer's public_profile row to populate the form.
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("public_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!error && data) {
        setPublicProfile(data);
        setCompanyLogoUrl(data.company_logo_url || data.photo_url || user.photoURL || null);
        form.reset({
          companyName: data.company_name || userProfile?.company_name || userProfile?.display_name || user.displayName || "",
          contactNumber: data.contact_number || "",
          supportEmail: data.support_email || "",
          companyOverview: data.company_overview || "",
        });
      } else if (userProfile) {
        // Fallback: use the auth-context userProfile (from the users table).
        form.reset({
          companyName: userProfile.company_name || userProfile.display_name || user.displayName || "",
          contactNumber: userProfile.contact_number || userProfile.phone || "",
          supportEmail: userProfile.support_email || "",
          companyOverview: userProfile.company_overview || "",
        });
      }
    };
    if (!authLoading) fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      });
      return;
    }
    try {
      const nowIso = new Date().toISOString();

      // Update public_profiles (canonical source for company data).
      const { error: ppError } = await supabase
        .from("public_profiles")
        .update({
          company_name: values.companyName,
          contact_number: values.contactNumber || null,
          support_email: values.supportEmail || null,
          company_overview: values.companyOverview,
          display_name: values.companyName,
          company_logo_url: companyLogoUrl,
          updated_at: nowIso,
        })
        .eq("id", user.id);
      if (ppError) {
        // Row may not exist yet — try upsert instead.
        const { error: ppUpsertError } = await supabase
          .from("public_profiles")
          .upsert(
            {
              id: user.id,
              company_name: values.companyName,
              contact_number: values.contactNumber || null,
              support_email: values.supportEmail || null,
              company_overview: values.companyOverview,
              display_name: values.companyName,
              company_logo_url: companyLogoUrl,
              role: "employer",
              updated_at: nowIso,
            },
            { onConflict: "id" }
          );
        if (ppUpsertError) throw ppUpsertError;
      }

      // Also update the users table so the auth-context realtime subscription
      // picks up the new display_name + company_name.
      const { error: uError } = await supabase
        .from("users")
        .update({
          company_name: values.companyName,
          display_name: values.companyName,
          updated_at: nowIso,
        })
        .eq("id", user.id);
      if (uError) {
        // Non-fatal — the public_profiles row is the source of truth.
        console.warn("users table update failed:", uError.message);
      }

      setIsEditMode(false);
      toast({
        title: "Profile Updated",
        description: "Your company profile has been saved successfully.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error?.message || "There was an error updating your profile.",
        variant: "destructive",
      });
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Reset form to original values when canceling.
      form.reset({
        companyName: publicProfile?.company_name || userProfile?.company_name || userProfile?.display_name || user?.displayName || "",
        contactNumber: publicProfile?.contact_number || userProfile?.contact_number || userProfile?.phone || "",
        supportEmail: publicProfile?.support_email || userProfile?.support_email || "",
        companyOverview: publicProfile?.company_overview || userProfile?.company_overview || "",
      });
    }
    setIsEditMode(!isEditMode);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.id);

    try {
      // Try the existing /api/upload endpoint (Cloudinary-backed).
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await response.json();
      setCompanyLogoUrl(url);

      // Persist the new logo URL to both public_profiles and users.
      const nowIso = new Date().toISOString();
      await supabase
        .from("public_profiles")
        .update({ company_logo_url: url, photo_url: url, updated_at: nowIso })
        .eq("id", user.id);
      await supabase
        .from("users")
        .update({ photo_url: url, updated_at: nowIso })
        .eq("id", user.id);

      toast({
        title: "Profile Picture Updated",
        description: "Your new picture has been saved.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Upload Error",
        description: "Failed to upload profile picture. The upload service may be unavailable.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("");

  const displayName =
    publicProfile?.company_name ||
    userProfile?.company_name ||
    userProfile?.display_name ||
    user?.displayName ||
    "";

  const contactNumber = publicProfile?.contact_number || userProfile?.contact_number || userProfile?.phone || "";
  const supportEmail = publicProfile?.support_email || userProfile?.support_email || "";
  const companyOverview = publicProfile?.company_overview || userProfile?.company_overview || "";
  const logoUrl = companyLogoUrl || user?.photoURL || "";

  return (
    <div className="container mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
        <p className="text-muted-foreground">Manage your company's public information.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>
                {isEditMode
                  ? "Edit your company information that will be displayed on your job postings."
                  : "View your company profile information."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleEditToggle} type="button">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={form.formState.isSubmitting}
                    type="button"
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleEditToggle}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditMode ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={logoUrl || ""} alt="Company logo" data-ai-hint="company logo" />
                      <AvatarFallback className="text-3xl">
                        {displayName ? getInitials(displayName) : "C"}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      type="button"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
                      <span className="sr-only">Edit company logo</span>
                    </Button>
                    <Input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Company LLC" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="(123) 456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supportEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="support@yourcompany.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        A public email for support inquiries.
                      </FormDescription>
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
                        <Textarea
                          placeholder="Describe your company, its mission, values, and culture."
                          {...field}
                          rows={6}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={logoUrl || ""} alt="Company logo" data-ai-hint="company logo" />
                  <AvatarFallback className="text-3xl">
                    {displayName ? getInitials(displayName) : "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 w-full">
                  <h3 className="text-2xl font-semibold">
                    {displayName || "Company Name Not Set"}
                  </h3>
                  <p className="text-muted-foreground">Company</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-2">Contact Number</h4>
                  <p className="text-sm text-muted-foreground">{contactNumber || "Not provided"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Support Email</h4>
                  <p className="text-sm text-muted-foreground">{supportEmail || "Not provided"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Company Overview</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {companyOverview || "No company overview provided yet."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
