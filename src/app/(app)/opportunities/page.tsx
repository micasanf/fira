"use client";

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Loader2,
  SlidersHorizontal,
  Check,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";
import { useSavedOpportunities } from "@/context/SavedOpportunitiesContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { LumaSpin } from "@/components/ui/luma-spin";

// Gradient backgrounds for avatars
const AVATAR_GRADIENTS = [
  'bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500',
  'bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500',
  'bg-gradient-to-br from-pink-400 via-rose-400 to-red-400',
  'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500',
  'bg-gradient-to-br from-amber-400 via-orange-400 to-red-400',
  'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400',
  'bg-gradient-to-br from-cyan-400 via-sky-400 to-blue-400',
  'bg-gradient-to-br from-slate-500 via-gray-600 to-zinc-700',
];

// Get consistent gradient based on identifier
const getGradient = (identifier: string) => {
  if (!identifier) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

interface Opportunity {
  id: string;
  title: string;
  employerId: string;
  employerName: string;
  employerPhotoURL?: string;
  location: string;
  type: string;
  companyOverview: string;
  description: string;
  rolesAndResponsibilities: string;
  skills: string;
  education: string;
  experience: string;
  preferredQualifications?: string;
  compensationAndBenefits: string;
  applicationInstructions: string;
  legalStatement: string;
  workingHours?: string;
  travelRequirements?: string;
  [key: string]: any;
}

const ITEMS_PER_PAGE = 9;

function OpportunitiesContent() {
  const searchParams = useSearchParams();
  const { saved, toggleSave } = useSavedOpportunities();
  const { user } = useAuth();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const [locationFilter, setLocationFilter] = useState(searchParams.get("location") || "all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [locations, setLocations] = useState<string[]>([]);

  // Fetch opportunities from Supabase
  useEffect(() => {
    const fetchOpportunities = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("opportunities")
          .select("*")
          .eq("is_active", true);

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching opportunities:", error);
          setOpportunities([]);
        } else if (data) {
          // Map snake_case to camelCase for component compatibility
          const mapped: Opportunity[] = data.map((opp: any) => ({
            id: opp.id,
            title: opp.title,
            employerId: opp.employer_id,
            employerName: opp.company || opp.employer_id,
            employerPhotoURL: opp.company_logo,
            location: opp.location,
            type: opp.type,
            companyOverview: opp.description,
            description: opp.description,
            rolesAndResponsibilities: "",
            skills: Array.isArray(opp.skills) ? opp.skills.join(", ") : (opp.skills || ""),
            education: "",
            experience: opp.experience_level || "",
            preferredQualifications: "",
            compensationAndBenefits: Array.isArray(opp.benefits) ? opp.benefits.join(", ") : "",
            applicationInstructions: "",
            legalStatement: "",
            workingHours: "",
            travelRequirements: "",
            status: opp.is_active ? "Active" : "Closed",
            applicants: opp.applications_count || 0,
            createdAt: opp.created_at,
            category: opp.category,
          }));

          setOpportunities(mapped);

          // Extract unique locations
          const uniqueLocations = Array.from(
            new Set(mapped.map((opp) => opp.location).filter(Boolean))
          ).sort() as string[];
          setLocations(uniqueLocations);
        }
      } catch (error) {
        console.error("Error fetching opportunities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, []);

  // Filter and sort opportunities
  const filteredOpportunities = useMemo(() => {
    let filtered = [...opportunities];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (opp) =>
          opp.title.toLowerCase().includes(query) ||
          opp.employerName.toLowerCase().includes(query) ||
          opp.skills.toLowerCase().includes(query) ||
          opp.location.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((opp) =>
        opp.type.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    // Location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter((opp) => opp.location === locationFilter);
    }

    // Sort
    switch (sortBy) {
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "applicants":
        filtered.sort((a, b) => (b.applicants || 0) - (a.applicants || 0));
        break;
    }

    return filtered;
  }, [opportunities, searchQuery, typeFilter, locationFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredOpportunities.length / ITEMS_PER_PAGE);
  const paginatedOpportunities = filteredOpportunities.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getInitials = (name: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
      : "";

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
        <LumaSpin />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
        <p className="text-muted-foreground">
          Browse and apply for job opportunities.
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Search opportunities..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="md:w-72"
        />
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="Job Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="full-time">Full-time</SelectItem>
            <SelectItem value="part-time">Part-time</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={locationFilter}
          onValueChange={(value) => {
            setLocationFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="applicants">Most Applicants</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {filteredOpportunities.length} opportunities found
      </p>

      {filteredOpportunities.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-20">
              <Briefcase className="h-12 w-12 mb-4" />
              <h2 className="text-xl font-semibold">No Opportunities Found</h2>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedOpportunities.map((opportunity) => {
              const isSaved = saved.some((s) => s.id === opportunity.id);
              const gradientClass = getGradient(opportunity.employerId || opportunity.employerName);

              return (
                <Card key={opportunity.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0",
                          gradientClass
                        )}
                      >
                        {getInitials(opportunity.employerName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/opportunities/${opportunity.id}`}>
                          <CardTitle className="text-base line-clamp-2 hover:text-primary transition-colors">
                            {opportunity.title}
                          </CardTitle>
                        </Link>
                        <CardDescription className="truncate">
                          {opportunity.employerName}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {opportunity.type && (
                        <Badge variant="secondary" className="rounded-full">
                          {opportunity.type}
                        </Badge>
                      )}
                      {opportunity.location && (
                        <span className="flex items-center text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {opportunity.location}
                        </span>
                      )}
                    </div>
                    {opportunity.skills && (
                      <div className="flex flex-wrap gap-1">
                        {opportunity.skills
                          .split(",")
                          .slice(0, 3)
                          .map((skill, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs rounded-full"
                            >
                              {skill.trim()}
                            </Badge>
                          ))}
                        {opportunity.skills.split(",").length > 3 && (
                          <Badge variant="outline" className="text-xs rounded-full">
                            +{opportunity.skills.split(",").length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button asChild className="flex-1 rounded-full" size="sm">
                      <Link href={`/opportunities/${opportunity.id}`}>View Details</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => toggleSave(opportunity)}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4",
                          isSaved && "fill-primary text-primary"
                        )}
                      />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { Briefcase } from "lucide-react";

export default function OpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
          <LumaSpin />
        </div>
      }
    >
      <OpportunitiesContent />
    </Suspense>
  );
}
