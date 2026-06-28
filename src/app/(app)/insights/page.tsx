"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  Target,
  Loader2,
  Sparkles,
  Bot,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Application {
  id: string;
  status: string;
  created_at: string | null;
  opportunity_title?: string | null;
  skills?: string[] | string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  pending: "#f59e0b",
  Approved: "#22c55e",
  approved: "#22c55e",
  Rejected: "#ef4444",
  rejected: "#ef4444",
  Withdrawn: "#6b7280",
  withdrawn: "#6b7280",
  Screening: "#8b5cf6",
  screening: "#8b5cf6",
  Reviewing: "#8b5cf6",
  reviewing: "#8b5cf6",
  Reviewed: "#8b5cf6",
  reviewed: "#8b5cf6",
  Shortlisted: "#a855f7",
  shortlisted: "#a855f7",
  Interview: "#3b82f6",
  interview: "#3b82f6",
  Interviewed: "#3b82f6",
  interviewed: "#3b82f6",
  Offer: "#10b981",
  offer: "#10b981",
  Offered: "#10b981",
  offered: "#10b981",
  Hired: "#059669",
  hired: "#059669",
  Applied: "#3b82f6",
  applied: "#3b82f6",
};

// Normalize a status string into a friendly display name
function prettyStatus(s: string | null | undefined): string {
  if (!s) return "Unknown";
  const lower = s.toLowerCase();
  if (lower === "applied") return "Applied";
  if (lower === "reviewing" || lower === "reviewed") return "Reviewing";
  if (lower === "shortlisted") return "Shortlisted";
  if (lower === "screening") return "Screening";
  if (lower === "pending") return "Pending";
  if (lower === "interview" || lower === "interviewed") return "Interview";
  if (lower === "offer" || lower === "offered") return "Offer";
  if (lower === "approved") return "Approved";
  if (lower === "rejected") return "Rejected";
  if (lower === "withdrawn") return "Withdrawn";
  if (lower === "hired") return "Hired";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function InsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>("");

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
            "id, status, created_at, opportunity_id, opportunities(title, skills)"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching applications:", error);
          return;
        }

        const mapped: Application[] = (data || []).map((row: any) => ({
          id: row.id,
          status: row.status || "pending",
          created_at: row.created_at,
          opportunity_title: row.opportunities?.title,
          skills:
            row.opportunities?.skills ||
            (Array.isArray(row.opportunities?.skills)
              ? row.opportunities.skills.join(", ")
              : null),
        }));

        setApplications(mapped);
      } catch (err) {
        console.error("Error fetching applications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  const stats = useMemo(() => {
    const total = applications.length;
    const approved = applications.filter(
      (a) =>
        a.status?.toLowerCase() === "approved" ||
        a.status?.toLowerCase() === "hired"
    ).length;
    const pending = applications.filter((a) => {
      const s = a.status?.toLowerCase();
      return s === "pending" || s === "screening" || s === "reviewing" || s === "reviewed" || s === "shortlisted";
    }).length;
    const rejected = applications.filter(
      (a) => a.status?.toLowerCase() === "rejected"
    ).length;
    const interviews = applications.filter((a) => {
      const s = a.status?.toLowerCase();
      return s === "interview" || s === "interviewed" || s === "offered" || s === "offer";
    }).length;
    const successRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { total, approved, pending, rejected, interviews, successRate };
  }, [applications]);

  // Status breakdown for pie chart
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((a) => {
      const label = prettyStatus(a.status);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS[name] || "#94a3b8",
    }));
  }, [applications]);

  // Weekly activity for bar chart (last 8 weeks)
  const weeklyActivity = useMemo(() => {
    const weeks: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const count = applications.filter((a) => {
        if (!a.created_at) return false;
        const d = new Date(a.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;

      weeks.push({
        label: `W${8 - i}`,
        count,
      });
    }
    return weeks;
  }, [applications]);

  // Top skills from approved/interviewed applications
  const topSkills = useMemo(() => {
    const skillCounts: Record<string, number> = {};
    applications
      .filter((a) => {
        const s = a.status?.toLowerCase();
        return (
          s === "approved" ||
          s === "hired" ||
          s === "interview" ||
          s === "interviewed" ||
          s === "offered"
        );
      })
      .forEach((a) => {
        if (!a.skills) return;
        const arr = Array.isArray(a.skills)
          ? a.skills
          : typeof a.skills === "string"
          ? a.skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        arr.forEach((skill) => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      });
    return Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [applications]);

  // ---------------------------------------------------------------
  // AI Insight (wrapped in try/catch — may fail without GenAI key)
  // ---------------------------------------------------------------
  const onGenerateAiInsight = () => {
    startTransition(async () => {
      try {
        // Lazy-import to avoid blocking initial render
        const { generateCareerPath } = await import("@/ai/flows/career-path");
        const result = await generateCareerPath({
          currentRole: "Job Seeker",
          targetRole: topSkills[0]?.[0]
            ? topSkills[0][0] + " Specialist"
            : "Next Role",
          currentSkills: topSkills.map(([s]) => s),
          yearsOfExperience: 0,
        });

        const quickWins = (result?.quickWins || [])
          .map((qw) => qw.action + " (" + qw.timeframe + ") - " + qw.impact)
          .join("\n");

        const steps = (result?.steps || [])
          .map(
            (s) =>
              s.order + ". " + s.title + " (" + s.durationMonths + "mo) - " + s.description
          )
          .join("\n");

        const text = [result?.summary, steps, quickWins]
          .filter(Boolean)
          .join("\n\n");

        setAiInsight(text || "No insight available.");
        toast({
          title: "AI Insight Generated",
          description: "Personalized career suggestions are ready.",
        });
      } catch (error) {
        console.error("AI insight failed:", error);
        toast({
          title: "AI Unavailable",
          description:
            "Could not generate AI insights right now. Try again later.",
          variant: "destructive",
        });
      }
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Applications",
      value: stats.total,
      icon: Briefcase,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Success Rate",
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "In Progress",
      value: stats.pending + stats.interviews,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Interviews",
      value: stats.interviews,
      icon: Target,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="min-h-screen -m-4 md:-m-6 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Insights
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track your application performance and trends
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateAiInsight}
            disabled={isPending || stats.total === 0}
            className="rounded-full"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Insight
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="rounded-3xl border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${card.bg}`}>
                        <Icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {card.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* AI Insight panel */}
        {aiInsight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="rounded-3xl border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  AI Career Insight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {aiInsight}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-3xl border-border/50 h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Application Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No applications yet
                  </p>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={180}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {statusData.map((entry) => (
                        <div
                          key={entry.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">
                              {entry.name}
                            </span>
                          </div>
                          <span className="font-medium">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Activity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="rounded-3xl border-border/50 h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Weekly Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                      name="Applications"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Skills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="rounded-3xl border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Top Skills (from successful apps)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Apply to more jobs to see skill trends
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {topSkills.map(([skill, count]) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="rounded-full text-sm py-1 px-3"
                      >
                        {skill}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ×{count}
                        </span>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="rounded-3xl border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-500" />
                  Quick Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Approved</span>
                  <span className="font-medium text-emerald-500">
                    {stats.approved}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-medium text-amber-500">
                    {stats.pending}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rejected</span>
                  <span className="font-medium text-red-500">
                    {stats.rejected}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">In Interviews</span>
                  <span className="font-medium text-violet-500">
                    {stats.interviews}
                  </span>
                </div>
                <div className="border-t border-border/50 pt-3 flex justify-between text-sm">
                  <span className="font-medium">Response Rate</span>
                  <span className="font-bold">
                    {stats.total > 0
                      ? Math.round(
                          ((stats.approved + stats.rejected) / stats.total) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
