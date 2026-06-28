"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSavedOpportunities } from "@/context/SavedOpportunitiesContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Briefcase, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LumaSpin } from "@/components/ui/luma-spin";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Kanban,
  type CardType,
  type ColumnType,
} from "@/components/ui/kanban";
import type { Dispatch, SetStateAction } from "react";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function statusToColumn(status: string | null | undefined): ColumnType {
  const s = (status || "").toLowerCase();
  if (s === "interview" || s === "interviewed") return "interview";
  if (
    s === "offered" ||
    s === "offer" ||
    s === "hired" ||
    s === "accepted" ||
    s === "approved"
  )
    return "offer";
  if (s === "rejected") return "rejected";
  // applied, reviewing, reviewed, shortlisted, pending, withdrawn
  return "applied";
}

export default function ApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { saved, toggleSave, loading: savedLoading } = useSavedOpportunities();
  const { toast } = useToast();
  const router = useRouter();

  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [cardToWithdraw, setCardToWithdraw] = useState<CardType | null>(null);

  // New application form state (manual entry)
  const [newApp, setNewApp] = useState({
    jobTitle: "",
    company: "",
    location: "",
    salary: "",
    jobUrl: "",
  });

  // ---------------------------------------------------------------
  // Load applications (manual + linked) from Supabase
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchApplications = async () => {
      try {
        const { data, error } = await supabase
          .from("applications")
          .select(
            "id, user_id, opportunity_id, employer_id, status, column_name, is_manual, title, company, location, salary, job_url, created_at, updated_at, opportunities(id, title, employer_name, location, employer_id)"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading applications:", error);
          return;
        }

        const mapped: CardType[] = (data || [])
          .filter((row: any) => {
            const s = (row.status || "").toLowerCase();
            return s !== "withdrawn";
          })
          .map((row: any) => {
            const opp = row.opportunities;
            const isManual = !!row.is_manual;
            const title = isManual
              ? row.title || "Unknown Job"
              : opp?.title || row.title || "Unknown Job";
            const company = isManual
              ? row.company || "Unknown Company"
              : opp?.employer_name || row.company || "Unknown Company";
            const location = isManual
              ? row.location
              : opp?.location || row.location;

            const column: ColumnType = isManual
              ? ((row.column_name as ColumnType) || "saved")
              : statusToColumn(row.status);

            return {
              id: row.id,
              title,
              company,
              location: location || undefined,
              column,
              jobUrl: row.job_url || undefined,
              salary: row.salary || undefined,
              isManual,
              isApplied: !isManual,
              opportunityId: row.opportunity_id || undefined,
              applicationId: row.id,
              employerId:
                row.employer_id || opp?.employer_id || undefined,
              employerName:
                opp?.employer_name || row.company || undefined,
              status: row.status || undefined,
            } as CardType;
          });

        setCards(mapped);
      } catch (err) {
        console.error("Error loading applications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  // ---------------------------------------------------------------
  // Convert saved opportunities to cards
  // ---------------------------------------------------------------
  const savedCards: CardType[] = saved.map((opp: any) => ({
    id: `saved_${opp.id}`,
    title: opp.title || "Unknown Job",
    company:
      opp.employer_name || opp.employerName || opp.company || "Unknown Company",
    location: opp.location,
    column: "saved" as ColumnType,
    opportunityId: opp.id,
    isSaved: true,
  }));

  // Merge: dedupe by opportunityId (favor applied/manual over saved)
  const allCards: CardType[] = [...cards];
  savedCards.forEach((savedCard) => {
    const exists = allCards.find(
      (c) =>
        c.id === savedCard.id ||
        (c.opportunityId && c.opportunityId === savedCard.opportunityId)
    );
    if (!exists) allCards.push(savedCard);
  });

  // ---------------------------------------------------------------
  // Persist a manual card to Supabase (insert or update)
  // ---------------------------------------------------------------
  const saveManualCard = useCallback(
    async (card: CardType) => {
      if (!user) return;
      const payload = {
        user_id: user.id,
        is_manual: true,
        title: card.title,
        company: card.company,
        location: card.location || null,
        salary: card.salary || null,
        job_url: card.jobUrl || null,
        column_name: card.column,
        status: card.column === "saved" ? "pending" : card.column,
        updated_at: new Date().toISOString(),
      };

      // Try update first (if card.id looks like a real UUID, not manual_/saved_)
      const isRealId =
        card.isManual &&
        !card.id.startsWith("manual_") &&
        !card.id.startsWith("saved_");

      if (isRealId) {
        const { error } = await supabase
          .from("applications")
          .update(payload)
          .eq("id", card.id)
          .eq("user_id", user.id);
        if (!error) return;
        // fall through to insert on error
      }

      const { data, error } = await supabase
        .from("applications")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        console.error("Error saving manual card:", error);
        throw error;
      }
      // Update the local card with the real id
      if (data?.id) {
        setCards((prev) =>
          prev.map((c) => (c.id === card.id ? { ...c, id: data.id } : c))
        );
      }
    },
    [user]
  );

  const deleteManualCard = useCallback(
    async (cardId: string) => {
      if (!user) return;
      // Only delete real DB rows
      if (cardId.startsWith("manual_") || cardId.startsWith("saved_")) return;
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", cardId)
        .eq("user_id", user.id)
        .eq("is_manual", true);
      if (error) console.error("Error deleting manual card:", error);
    },
    [user]
  );

  // ---------------------------------------------------------------
  // Withdraw an applied application
  // ---------------------------------------------------------------
  const withdrawApplication = async (card: CardType) => {
    if (!user || !card.isApplied) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("applications")
        .update({
          status: "withdrawn",
          withdrawn_at: now,
          updated_at: now,
        })
        .eq("id", card.id)
        .eq("user_id", user.id);
      if (error) throw error;

      setCards((prev) => prev.filter((c) => c.id !== card.id));
      toast({ title: "Application withdrawn" });
    } catch (error) {
      console.error("Error withdrawing:", error);
      toast({
        title: "Failed to withdraw application",
        variant: "destructive",
      });
    }
  };

  const unsaveOpportunity = (card: CardType) => {
    if (!card.isSaved || !card.opportunityId) return;
    const opportunity = saved.find((s) => s.id === card.opportunityId);
    if (opportunity) {
      toggleSave(opportunity);
      toast({ title: "Removed from saved" });
    }
  };

  // ---------------------------------------------------------------
  // Handle kanban mutations (moves, deletes, reorders)
  // ---------------------------------------------------------------
  const handleSetCards = useCallback<Dispatch<SetStateAction<CardType[]>>>(
    (newCards) => {
      setCards((prev) => {
        const prevAll = [
          ...prev,
          ...savedCards.filter(
            (sc) =>
              !prev.find(
                (p) =>
                  p.id === sc.id ||
                  (p.opportunityId && p.opportunityId === sc.opportunityId)
              )
          ),
        ];
        const updatedAll =
          typeof newCards === "function" ? newCards(prevAll) : newCards;

        // Find deleted cards
        const deleted = prevAll.filter(
          (old) => !updatedAll.find((nw) => nw.id === old.id)
        );

        for (const card of deleted) {
          if (card.isManual) {
            deleteManualCard(card.id);
          } else if (card.isApplied) {
            setCardToWithdraw(card);
            setWithdrawDialogOpen(true);
            return prev; // bail — wait for confirm
          } else if (card.isSaved) {
            unsaveOpportunity(card);
          }
        }

        // Find cards whose column changed
        const changed = updatedAll.filter((nw) => {
          const old = prevAll.find((o) => o.id === nw.id);
          if (!old) return false;
          return old.column !== nw.column;
        });

        // Persist changes asynchronously (don't block UI)
        changed.forEach((card) => {
          if (card.isManual) {
            saveManualCard(card).catch((e) =>
              console.error("Failed to sync manual card:", e)
            );
          } else if (card.isApplied) {
            // Map kanban column back to application status
            const statusMap: Record<ColumnType, string> = {
              saved: "pending",
              applied: "applied",
              interview: "interview",
              offer: "offered",
              rejected: "rejected",
            };
            const newStatus = statusMap[card.column];
            const now = new Date().toISOString();
            supabase
              .from("applications")
              .update({
                status: newStatus,
                column_name: card.column,
                updated_at: now,
              })
              .eq("id", card.id)
              .eq("user_id", user?.id || "")
              .then(({ error }) => {
                if (error)
                  console.error("Error updating application status:", error);
              });
          }
        });

        // Strip out saved cards before storing in our local state —
        // they are derived from the SavedOpportunitiesContext.
        const ownCards = updatedAll.filter(
          (c) => !c.id.startsWith("saved_")
        );
        return ownCards;
      });
    },
    [savedCards, saveManualCard, deleteManualCard, user, saved, toggleSave]
  );

  // ---------------------------------------------------------------
  // Add new manual application
  // ---------------------------------------------------------------
  const handleAddApplication = async () => {
    if (!user || !newApp.jobTitle.trim() || !newApp.company.trim()) {
      toast({
        title: "Please fill in job title and company",
        variant: "destructive",
      });
      return;
    }

    const tempId = `manual_${Date.now()}`;
    const newCard: CardType = {
      id: tempId,
      title: newApp.jobTitle,
      company: newApp.company,
      location: newApp.location || undefined,
      salary: newApp.salary || undefined,
      jobUrl: newApp.jobUrl || undefined,
      column: "saved" as ColumnType,
      isManual: true,
    };

    // Optimistic insert
    setCards((prev) => [newCard, ...prev]);
    setNewApp({ jobTitle: "", company: "", location: "", salary: "", jobUrl: "" });
    setIsAddDialogOpen(false);

    try {
      await saveManualCard(newCard);
      toast({ title: "Application added!" });
    } catch (error) {
      console.error("Error adding application:", error);
      // Roll back
      setCards((prev) => prev.filter((c) => c.id !== tempId));
      toast({ title: "Failed to add application", variant: "destructive" });
    }
  };

  // ---------------------------------------------------------------
  // Filter by search
  // ---------------------------------------------------------------
  const filteredCards = searchQuery
    ? allCards.filter(
        (card) =>
          card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.company.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allCards;

  // ---------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------
  const stats = {
    total: allCards.length,
    saved: allCards.filter((c) => c.column === "saved").length,
    applied: allCards.filter((c) => c.column === "applied").length,
    interview: allCards.filter((c) => c.column === "interview").length,
    offer: allCards.filter((c) => c.column === "offer").length,
    rejected: allCards.filter((c) => c.column === "rejected").length,
  };

  // ---------------------------------------------------------------
  // Loading / not-logged-in
  // ---------------------------------------------------------------
  if (authLoading || loading || savedLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
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

  return (
    <div className="h-full flex flex-col bg-background -m-4 md:-m-6">
      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <AlertDialogContent className="bg-card border-border rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Withdraw Application?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to withdraw your application for{" "}
              {cardToWithdraw?.title} at {cardToWithdraw?.company}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 rounded-full"
              onClick={() => {
                if (cardToWithdraw) {
                  withdrawApplication(cardToWithdraw);
                }
                setWithdrawDialogOpen(false);
                setCardToWithdraw(null);
              }}
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <Briefcase className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Application Tracker
                </h1>
                <p className="text-sm text-muted-foreground">
                  {stats.total} total • {stats.applied} applied •{" "}
                  {stats.interview} interviews • {stats.offer} offers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search jobs..."
                  className="pl-9 w-64 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700 rounded-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Application
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">
                      Add New Application
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Track a new job application manually
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Job Title *</Label>
                      <Input
                        value={newApp.jobTitle}
                        onChange={(e) =>
                          setNewApp({ ...newApp, jobTitle: e.target.value })
                        }
                        placeholder="Software Engineer"
                        className="bg-muted border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Company *</Label>
                      <Input
                        value={newApp.company}
                        onChange={(e) =>
                          setNewApp({ ...newApp, company: e.target.value })
                        }
                        placeholder="Google"
                        className="bg-muted border-border text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Location</Label>
                        <Input
                          value={newApp.location}
                          onChange={(e) =>
                            setNewApp({ ...newApp, location: e.target.value })
                          }
                          placeholder="San Francisco, CA"
                          className="bg-muted border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Salary</Label>
                        <Input
                          value={newApp.salary}
                          onChange={(e) =>
                            setNewApp({ ...newApp, salary: e.target.value })
                          }
                          placeholder="$120k - $150k"
                          className="bg-muted border-border text-foreground"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Job URL</Label>
                      <Input
                        value={newApp.jobUrl}
                        onChange={(e) =>
                          setNewApp({ ...newApp, jobUrl: e.target.value })
                        }
                        placeholder="https://..."
                        className="bg-muted border-border text-foreground"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      className="border-border text-foreground rounded-full"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddApplication}
                      className="bg-violet-600 hover:bg-violet-700 rounded-full"
                    >
                      Add Application
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto">
        <Kanban
          cards={filteredCards}
          setCards={handleSetCards}
          className="min-h-full"
          onChat={(card) => {
            if (card.employerId && card.opportunityId && card.applicationId) {
              const params = new URLSearchParams({
                userId: card.employerId,
                userName: card.employerName || card.company,
                opportunityId: card.opportunityId,
                opportunityTitle: card.title,
                applicationId: card.applicationId,
              });
              router.push(`/chat/new?${params.toString()}`);
            } else {
              toast({
                title: "Cannot start chat",
                description:
                  "Missing employer information for this application.",
                variant: "destructive",
              });
            }
          }}
        />
      </div>
    </div>
  );
}
