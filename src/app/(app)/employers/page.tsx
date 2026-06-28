"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  Search,
  Briefcase,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import { LumaSpin } from "@/components/ui/luma-spin";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

interface Employer {
  id: string;
  display_name?: string;
  email?: string;
  photo_url?: string;
  company_logo_url?: string;
  company_name?: string;
  company?: string;
  bio?: string;
  company_overview?: string;
  location?: string;
  industry?: string;
  openPositions?: number;
  [key: string]: any;
}

const AVATAR_GRADIENTS = [
  "from-blue-400 via-indigo-500 to-purple-500",
  "from-violet-400 via-purple-500 to-fuchsia-500",
  "from-pink-400 via-rose-400 to-red-400",
  "from-emerald-400 via-teal-500 to-cyan-500",
  "from-amber-400 via-orange-400 to-red-400",
  "from-yellow-300 via-amber-400 to-orange-400",
  "from-cyan-400 via-sky-400 to-blue-400",
  "from-slate-500 via-gray-600 to-zinc-700",
];

function getGradient(identifier: string) {
  let hash = 0;
  if (!identifier) return AVATAR_GRADIENTS[0];
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export default function EmployersPage() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openCounts, setOpenCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchEmployers = async () => {
      try {
        // Fetch all employer users from public_profiles
        const { data, error } = await supabase
          .from("public_profiles")
          .select("*")
          .eq("role", "employer");

        if (error) throw error;

        const employerData: Employer[] = (data || []).map((row: any) => ({
          id: row.id,
          ...row,
        }));
        setEmployers(employerData);

        // Fetch active opportunity counts per employer
        const { data: oppsData, error: oppsError } = await supabase
          .from("opportunities")
          .select("employer_id, status")
          .eq("status", "active");

        if (!oppsError && oppsData) {
          const counts: Record<string, number> = {};
          oppsData.forEach((row: any) => {
            const empId = row.employer_id;
            if (empId) {
              counts[empId] = (counts[empId] || 0) + 1;
            }
          });
          setOpenCounts(counts);
        }
      } catch (error) {
        console.error("Error fetching employers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployers();
  }, []);

  const filteredEmployers = useMemo(() => {
    if (!searchQuery.trim()) return employers;
    const q = searchQuery.toLowerCase();
    return employers.filter(
      (emp) =>
        emp.display_name?.toLowerCase().includes(q) ||
        emp.company_name?.toLowerCase().includes(q) ||
        emp.industry?.toLowerCase().includes(q) ||
        emp.location?.toLowerCase().includes(q)
    );
  }, [employers, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
        <LumaSpin />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Browse Employers
          </h1>
        </div>
        <p className="text-muted-foreground">
          Discover companies and see their open positions.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company, industry, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-full"
        />
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        {filteredEmployers.length} employer
        {filteredEmployers.length !== 1 ? "s" : ""} found
      </p>

      {/* Grid */}
      {filteredEmployers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {searchQuery
                ? "No employers match your search."
                : "No employers found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployers.map((employer) => {
            const gradient = getGradient(employer.id);
            const positionCount = openCounts[employer.id] || 0;
            const displayName =
              employer.company_name ||
              employer.display_name ||
              "Employer";
            const photo = employer.company_logo_url || employer.photo_url;

            return (
              <Card
                key={employer.id}
                className="group flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 rounded-3xl border border-border bg-card shadow-sm"
              >
                {/* Header band */}
                <div className="h-20 bg-muted/60 dark:bg-muted/20 relative w-full">
                  <Avatar className="absolute -bottom-6 left-6 h-16 w-16 border-4 border-background shadow-md">
                    <AvatarImage
                      src={photo}
                      className="bg-background object-cover"
                    />
                    <AvatarFallback
                      className={`bg-gradient-to-br ${gradient} text-white text-xl font-bold`}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <CardHeader className="pt-10 pb-3">
                  <CardTitle className="text-lg">{displayName}</CardTitle>
                  {employer.industry && (
                    <Badge variant="secondary" className="w-fit">
                      {employer.industry}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-3">
                  {(employer.bio || employer.company_overview) && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {employer.company_overview || employer.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {employer.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {employer.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {positionCount} open position
                      {positionCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="pt-2 mt-auto">
                    <Link href={`/company/${employer.id}`}>
                      <InteractiveHoverButton
                        text="View Profile"
                        className="w-full"
                      />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
