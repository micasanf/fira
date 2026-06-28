"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Users,
  UserSearch,
  Loader2,
  Send,
  Check,
  X,
  Eye,
  MessageSquare,
  Video,
  Kanban,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { ComprehensiveATSScorer } from "@/lib/comprehensiveAtsScorer";
import { createNotification } from "@/lib/notifications";

// Safe date parser handling string | Date | Firestore Timestamp-like shapes.
function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (v?.toDate) {
    try { return v.toDate(); } catch { return null; }
  }
  if (v?.seconds != null) return new Date(v.seconds * 1000);
  return null;
}

interface Applicant {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  photoURL?: string;
  submittedAt: any;
  status: string;
  coverLetter: string;
  employmentHistory: string;
  references: string;
  portfolioLink: string;
  linkedinLink: string;
  education: string;
  skills: string;
  employability?: string;
  [key: string]: any;
}

interface Opportunity {
  id: string;
  title: string;
  employerName: string;
  description?: string;
  rolesAndResponsibilities?: string;
  skills?: string | string[];
  education?: string;
  experience?: string;
}

// Loose type for AI-flow candidate (kept loose since the flow may fail).
type PotentialCandidate = {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  skills?: string;
  matchPercentage?: number;
  justification?: string;
  applicationStatus?: string;
};

export default function ApplicantsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [potentialCandidates, setPotentialCandidates] = useState<PotentialCandidate[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const [applicantStatusFilter, setApplicantStatusFilter] = useState("all");
  const [matchPercentageFilter, setMatchPercentageFilter] = useState([0]);

  const startChatWithApplicant = (applicant: Applicant) => {
    if (!user || !opportunity) return;
    const qp = new URLSearchParams({
      userId: applicant.userId,
      userName: applicant.userName,
      userPhoto: applicant.photoURL || "",
      opportunityId: id as string,
      opportunityTitle: opportunity.title,
      applicationId: applicant.id,
    });
    router.push(`/chat/new?${qp.toString()}`);
  };

  const startVideoCallWithApplicant = (applicant: Applicant) => {
    if (!user || !opportunity) return;
    const qp = new URLSearchParams({
      recipientId: applicant.userId,
      recipientName: applicant.userName,
      opportunityId: id as string,
      opportunityTitle: opportunity.title,
      applicationId: applicant.id,
    });
    router.push(`/video-call?${qp.toString()}`);
  };

  useEffect(() => {
    if (!id) return;

    const fetchPageData = async () => {
      setLoading(true);
      try {
        // Fetch opportunity details.
        const { data: opp, error: oppError } = await supabase
          .from("opportunities")
          .select("*")
          .eq("id", id)
          .single();

        if (!oppError && opp) {
          const skills = Array.isArray(opp.skills) ? opp.skills.join(", ") : opp.skills || "";
          setOpportunity({
            id: opp.id,
            title: opp.title,
            employerName: opp.employer_name || opp.company || "",
            description: opp.description || "",
            rolesAndResponsibilities: opp.roles_and_responsibilities || "",
            skills,
            education: opp.education || "",
            experience: opp.experience || "",
          });
        }

        // Fetch applications for this opportunity.
        const { data: apps, error: appsError } = await supabase
          .from("applications")
          .select("id, user_id, status, cover_letter, applied_at, created_at, submitted_at, user_email, user_name")
          .eq("opportunity_id", id)
          .order("applied_at", { ascending: false, nullsFirst: false });

        if (appsError) throw appsError;

        const appsList = (apps || []) as any[];
        const userIds = appsList.map((a) => a.user_id).filter(Boolean);

        // Fetch applicant profile details (skills, education, employment_history, references, portfolio_link, linkedin) from users.
        const profileMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, display_name, photo_url, skills, education, employment_history, references, portfolio_link, linkedin, bio")
            .in("id", userIds);
          if (!usersError && users) {
            for (const u of users as any[]) {
              profileMap[u.id] = u;
            }
          }
        }

        const applicantsData: Applicant[] = appsList.map((a) => {
          const profile = profileMap[a.user_id] || {};
          const skillsArr = Array.isArray(profile.skills) ? profile.skills : [];
          return {
            id: a.id,
            userId: a.user_id,
            userName: a.user_name || profile.display_name || "Applicant",
            userEmail: a.user_email || "",
            photoURL: profile.photo_url || "",
            submittedAt: a.applied_at || a.submitted_at || a.created_at,
            status: a.status || "applied",
            coverLetter: a.cover_letter || "",
            employmentHistory: profile.employment_history || "",
            references: profile.references || "",
            portfolioLink: profile.portfolio_link || "",
            linkedinLink: profile.linkedin || "",
            education: profile.education || "",
            skills: typeof skillsArr === "string" ? skillsArr : skillsArr.join(", "),
            employability: profile.employability || undefined,
          };
        });
        setApplicants(applicantsData);

        // Best-effort: fetch potential candidates via AI flow. Wrapped in try/catch.
        if (user) {
          setCandidatesLoading(true);
          try {
            const { findAndRankCandidates }: any = await import(
              "@/ai/flows/find-and-rank-candidates"
            );
            const result = await findAndRankCandidates({ employerId: user.id });
            const candidates: PotentialCandidate[] = (result?.candidates || []).map((c: any) => ({
              uid: c.uid,
              displayName: c.displayName,
              email: c.email,
              photoURL: c.photoURL,
              skills: c.skills,
              matchPercentage: c.matchPercentage,
              justification: c.justification,
              applicationStatus: c.applicationStatus,
            }));
            setPotentialCandidates(candidates);
          } catch (aiErr) {
            console.warn("findAndRankCandidates flow skipped/failed:", aiErr);
            setPotentialCandidates([]);
            toast({
              title: "Candidate Ranking Unavailable",
              description:
                "The AI candidate ranking service is currently unavailable. You can still see your existing applicants below.",
            });
          } finally {
            setCandidatesLoading(false);
          }
        }
      } catch (error) {
        console.error("Error fetching page data:", error);
        toast({
          title: "Error",
          description: "Could not fetch applicant data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filteredApplicants = useMemo(() => {
    if (applicantStatusFilter === "all") return applicants;
    return applicants.filter((a) => (a.status || "").toLowerCase() === applicantStatusFilter);
  }, [applicants, applicantStatusFilter]);

  const filteredPotentialCandidates = useMemo(() => {
    return potentialCandidates.filter(
      (c) => (c.matchPercentage || 0) >= matchPercentageFilter[0]
    );
  }, [potentialCandidates, matchPercentageFilter]);

  const handleNotify = () => {
    toast({
      title: "Notifications Simulated",
      description: `If configured, emails would be sent to ${filteredPotentialCandidates.length} candidates.`,
    });
  };

  const handleDismissPotential = (uid: string) => {
    setPotentialCandidates((prev) => prev.filter((c) => c.uid !== uid));
    toast({
      title: "Candidate Dismissed",
      description: "The potential candidate has been removed from this list.",
    });
  };

  const handleInvitePotential = async (uid: string) => {
    const candidate = potentialCandidates.find((c) => c.uid === uid);
    if (!candidate || !opportunity || !id || !uid) {
      toast({
        title: "Error",
        description: "Missing candidate, opportunity, or ID.",
        variant: "destructive",
      });
      return;
    }

    // Update UI optimistically.
    setPotentialCandidates((prev) =>
      prev.map((c) => (c.uid === uid ? { ...c, applicationStatus: "invited" } : c))
    );

    try {
      // Try to upsert an "invited" application row. Use insert with onConflict to skip if already exists.
      const { error: inviteError } = await supabase
        .from("applications")
        .upsert(
          {
            opportunity_id: id,
            user_id: uid,
            employer_id: user?.id || null,
            status: "pending",
            user_email: candidate.email || null,
            user_name: candidate.displayName || null,
            is_manual: true,
            applied_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "opportunity_id,user_id" }
        );

      if (inviteError) throw inviteError;

      toast({
        title: "Invitation Sent",
        description: "The candidate has been invited to apply.",
      });
    } catch (e: any) {
      console.error("Failed to invite candidate:", e);
      toast({
        title: "Error",
        description: e?.message || "Failed to invite candidate.",
        variant: "destructive",
      });
      // Revert UI on error.
      setPotentialCandidates((prev) =>
        prev.map((c) => (c.uid === uid ? { ...c, applicationStatus: "not_applied" } : c))
      );
    }
  };

  const handleUpdateStatus = async (
    applicant: Applicant,
    status: "approved" | "rejected"
  ) => {
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", applicant.id);
      if (error) throw error;

      setApplicants((prev) =>
        prev.map((a) => (a.id === applicant.id ? { ...a, status } : a))
      );

      toast({
        title: `Application ${status === "approved" ? "Approved" : "Rejected"}`,
        description: `The candidate has been notified of their application status.`,
      });

      // Best-effort notification + email; failures are logged but do not block UI.
      try {
        await createNotification({
          userId: applicant.userId,
          type: "application_update" as any,
          title: `Application ${status === "approved" ? "Approved" : "Rejected"}`,
          message: `Your application for ${opportunity?.title || "a position"} has been ${status}.`,
          link: "/applications",
          actorId: user?.id,
          actorName: opportunity?.employerName,
          metadata: {
            applicationId: applicant.id,
            opportunityId: id as string,
          },
        });
      } catch (nErr) {
        console.warn("Notification creation failed:", nErr);
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error?.message || "Could not update the application status.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("") || "";

  const renderApplicationDetail = (applicant: Applicant) => {
    const resumeText = [
      applicant.education,
      applicant.skills,
      applicant.employmentHistory,
      applicant.coverLetter,
      applicant.references,
    ]
      .filter(Boolean)
      .join(" ");

    const oppSkillsStr = Array.isArray(opportunity?.skills)
      ? opportunity.skills.join(", ")
      : opportunity?.skills || "";

    const jobDesc = [
      opportunity?.title,
      opportunity?.description,
      opportunity?.rolesAndResponsibilities,
      oppSkillsStr,
      opportunity?.education,
      opportunity?.experience,
    ]
      .filter(Boolean)
      .join(" ");

    let atsResult: any = null;
    if (resumeText && jobDesc) {
      try {
        const scorer = new ComprehensiveATSScorer();
        atsResult = scorer.calculateComprehensiveScore(resumeText, jobDesc);
      } catch (e) {
        // ignore
      }
    }

    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-1">Cover Letter</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {applicant.coverLetter || "Not provided"}
          </p>
        </div>
        {applicant.employability && (
          <div>
            <Badge variant="outline" className="mb-2">
              {applicant.employability}
            </Badge>
          </div>
        )}
        <Separator />
        <div>
          <h4 className="font-semibold text-sm mb-1">Skills</h4>
          <div className="flex flex-wrap gap-1">
            {(applicant.skills || "")
              .split(",")
              .map((skill, i) =>
                skill && skill.trim() ? (
                  <Badge key={i} variant="secondary">
                    {skill.trim()}
                  </Badge>
                ) : null
              )}
          </div>
        </div>
        <Separator />
        <div>
          <h4 className="font-semibold text-sm mb-1">Employment History</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {applicant.employmentHistory || "Not provided"}
          </p>
        </div>
        <Separator />
        <div>
          <h4 className="font-semibold text-sm mb-1">References</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {applicant.references || "Not provided"}
          </p>
        </div>
        {(applicant.portfolioLink || applicant.linkedinLink) && <Separator />}
        {applicant.portfolioLink && (
          <div>
            <h4 className="font-semibold text-sm mb-1">Portfolio</h4>
            <Link
              href={applicant.portfolioLink}
              target="_blank"
              className="text-sm text-primary hover:underline break-all"
            >
              {applicant.portfolioLink}
            </Link>
          </div>
        )}
        {applicant.linkedinLink && (
          <div>
            <h4 className="font-semibold text-sm mb-1">LinkedIn Profile</h4>
            <Link
              href={applicant.linkedinLink}
              target="_blank"
              className="text-sm text-primary hover:underline break-all"
            >
              {applicant.linkedinLink}
            </Link>
          </div>
        )}
        <Separator />
        <div>
          <h4 className="font-semibold text-sm mb-1">ATS Score Checker</h4>
          {!resumeText || !jobDesc ? (
            <div className="text-xs text-muted-foreground">
              Not enough data to compute ATS score.
            </div>
          ) : atsResult ? (
            <div className="text-xs">
              <div className="mb-1">
                <b>ATS Score:</b>{" "}
                <span className="text-primary font-semibold">
                  {atsResult.overallScore}%
                </span>{" "}
                <span className="ml-2 text-muted-foreground">
                  ({atsResult.confidenceLevel} match)
                </span>
              </div>
              <div className="mb-1">
                <b>Category Breakdown:</b>
                <ul className="ml-2">
                  {Object.entries(atsResult.categoryScores || {}).map(
                    ([cat, val]: any) => (
                      <li key={cat}>
                        {cat}: {Math.round(val as number)}%
                      </li>
                    )
                  )}
                </ul>
              </div>
              <div className="mb-1 text-green-700">
                <b>Matched:</b>
                <ul className="ml-2">
                  {Object.entries(atsResult.matched || {}).map(([cat, arr]: any) =>
                    Array.isArray(arr) && arr.length > 0 ? (
                      <li key={cat}>
                        {cat}: {arr.slice(0, 8).join(", ")}
                        {arr.length > 8 ? "..." : ""}
                      </li>
                    ) : null
                  )}
                </ul>
              </div>
              <div className="mb-1 text-red-700">
                <b>Missing:</b>
                <ul className="ml-2">
                  {Object.entries(atsResult.missing || {}).map(([cat, arr]: any) =>
                    Array.isArray(arr) && arr.length > 0 ? (
                      <li key={cat}>
                        {cat}: {arr.slice(0, 8).join(", ")}
                        {arr.length > 8 ? "..." : ""}
                      </li>
                    ) : null
                  )}
                </ul>
              </div>
              <div className="mb-1 text-muted-foreground">
                <b>Suggestions:</b>
                <ul className="ml-2">
                  {(atsResult.suggestions || []).map((s: any, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Could not compute ATS score.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/employer/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle>Top-Ranked Candidates</CardTitle>
                <CardDescription>
                  Users with skills matching your active opportunities.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="rounded-3xl"
                onClick={handleNotify}
                disabled={filteredPotentialCandidates.length === 0}
              >
                <Send className="mr-2 h-4 w-4" />
                Notify All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2">
              <Label htmlFor="match-slider">
                Minimum Match: {matchPercentageFilter[0]}%
              </Label>
              <Slider
                id="match-slider"
                min={0}
                max={100}
                step={10}
                value={matchPercentageFilter}
                onValueChange={setMatchPercentageFilter}
              />
            </div>

            {candidatesLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPotentialCandidates.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <UserSearch className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No new matches found</h3>
                <p>
                  No top-ranked candidates match your criteria, or the AI matching
                  service is unavailable.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPotentialCandidates.map((candidate) => (
                  <div
                    key={candidate.uid}
                    className="flex items-center gap-2 p-2 rounded-3xl hover:bg-accent"
                  >
                    <Link
                      href={`/users/${candidate.uid}`}
                      className="flex items-center gap-4 flex-1"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={candidate.photoURL}
                          alt={candidate.displayName}
                          data-ai-hint="profile avatar"
                        />
                        <AvatarFallback>
                          {getInitials(candidate.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-none">
                            {candidate.displayName}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-primary border-primary/50"
                          >
                            {candidate.matchPercentage ?? 0}%
                          </Badge>
                        </div>
                        {opportunity?.title && (
                          <span className="inline-block text-xs bg-muted px-2 py-0.5 rounded-3xl mb-1 mt-1 text-muted-foreground">
                            Matched for:{" "}
                            <span className="font-medium text-primary">
                              {opportunity.title}
                            </span>
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {candidate.justification}
                        </p>
                      </div>
                    </Link>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-3xl"
                        disabled={
                          candidate.applicationStatus === "invited" ||
                          candidate.applicationStatus === "applied"
                        }
                        onClick={() => handleInvitePotential(candidate.uid)}
                      >
                        {candidate.applicationStatus === "invited"
                          ? "Invited"
                          : candidate.applicationStatus === "applied"
                          ? "Already Applied"
                          : "Invite"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-3xl"
                        onClick={() => handleDismissPotential(candidate.uid)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Applicants</CardTitle>
              <CardDescription>
                People who have applied for this posting.
              </CardDescription>
            </div>
            <Link href={`/employer/postings/${params.id}/pipeline`}>
              <Button variant="outline" size="sm" className="rounded-full gap-1.5">
                <Kanban className="h-3.5 w-3.5" />
                Pipeline View
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Select
                value={applicantStatusFilter}
                onValueChange={setApplicantStatusFilter}
              >
                <SelectTrigger className="w-[180px] rounded-3xl">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="rounded-3xl">
                  <SelectItem className="rounded-3xl" value="all">
                    All Statuses
                  </SelectItem>
                  <SelectItem className="rounded-3xl" value="applied">
                    Submitted
                  </SelectItem>
                  <SelectItem className="rounded-3xl" value="approved">
                    Approved
                  </SelectItem>
                  <SelectItem className="rounded-3xl" value="rejected">
                    Rejected
                  </SelectItem>
                  <SelectItem className="rounded-3xl" value="interview">
                    Interview
                  </SelectItem>
                  <SelectItem className="rounded-3xl" value="offered">
                    Offered
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredApplicants.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No applicants yet</h3>
                <p>Check back later to see who has applied for this role.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredApplicants.map((applicant) => {
                  const d = toDate(applicant.submittedAt);
                  const statusLower = (applicant.status || "").toLowerCase();
                  const isApproved = statusLower === "approved";
                  const isRejected = statusLower === "rejected";
                  const showChatActions =
                    isApproved ||
                    statusLower === "interview" ||
                    statusLower === "offered" ||
                    statusLower === "shortlisted";
                  return (
                    <div
                      key={applicant.id}
                      className="flex items-center gap-2 p-2 rounded-3xl hover:bg-accent"
                    >
                      <Link
                        href={`/users/${applicant.userId}`}
                        className="flex items-center gap-4 flex-1"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={applicant.photoURL}
                            alt={applicant.userName}
                            data-ai-hint="profile avatar"
                          />
                          <AvatarFallback>
                            {getInitials(applicant.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium leading-none">
                              {applicant.userName}
                            </p>
                            <Badge
                              variant={
                                isApproved
                                  ? "secondary"
                                  : isRejected
                                  ? "destructive"
                                  : "outline"
                              }
                              className="capitalize"
                            >
                              {applicant.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Applied on {d ? format(d, "PPP") : "—"}
                          </p>
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-3xl"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Application Details</DialogTitle>
                              <DialogDescription>
                                Submitted by {applicant.userName} for the{" "}
                                {opportunity?.title} position.
                              </DialogDescription>
                            </DialogHeader>
                            {renderApplicationDetail(applicant)}
                          </DialogContent>
                        </Dialog>

                        {showChatActions && (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-3xl text-primary hover:text-primary border-primary/20 hover:bg-primary/10"
                              onClick={() => startChatWithApplicant(applicant)}
                              title="Chat with applicant"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-3xl text-emerald-600 hover:text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => startVideoCallWithApplicant(applicant)}
                              title="Video call with applicant"
                            >
                              <Video className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-3xl text-green-600 hover:text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleUpdateStatus(applicant, "approved")}
                          disabled={isApproved || isRejected}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-3xl text-red-600 hover:text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleUpdateStatus(applicant, "rejected")}
                          disabled={isApproved || isRejected}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
