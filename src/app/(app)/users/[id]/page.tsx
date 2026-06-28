"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  Building,
  Mail,
  Briefcase,
  Star,
  Lightbulb,
  Target,
  Phone,
  Linkedin,
  Link as LinkIcon,
  GraduationCap,
  MapPin,
  Users,
  Grid3X3,
  MessageCircle,
  UserPlus,
  UserMinus,
  Check,
  User,
  Github,
  Twitter,
  Globe,
  FolderOpen,
  ExternalLink,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LumaSpin } from "@/components/ui/luma-spin";
import { FollowersModal } from "@/components/followers-modal";

interface PortfolioProject {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
}

interface UserProfile {
  id: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  photo_url?: string;
  cover_photo?: string;
  headline?: string;
  location?: string;
  contact_number?: string;
  support_email?: string;
  company_name?: string;
  company_overview?: string;
  education?: string;
  skills?: string[];
  interests?: string;
  career_goals?: string;
  employment_history?: string;
  portfolio_link?: string;
  portfolio_projects?: PortfolioProject[];
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
  followers?: string[];
  following?: string[];
  [key: string]: any;
}

interface FeedPost {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  userRole?: string;
  userTitle?: string;
  content: string;
  imageUrl?: string;
  likes: string[];
  comments: any[];
  shares: number;
  createdAt: Date;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, userProfile: currentUserProfile } = useAuth();
  const { startDirectMessage } = useChat();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [followersList, setFollowersList] = useState<string[]>([]);
  const [followingList, setFollowingList] = useState<string[]>([]);

  const isOwnProfile = user?.id === id;

  // Fetch user profile
  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        // public_profiles contains followers/following + all public fields.
        const { data, error } = await supabase
          .from("public_profiles")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          // Fallback: try the users table (private columns visible to owner)
          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("id", id)
            .single();

          if (userData) {
            const profileData = {
              id: userData.id,
              ...userData,
              followers: [],
              following: [],
              contact_number: userData.phone,
            } as UserProfile;
            setProfile(profileData);
            setFollowersCount(0);
            setFollowingCount(0);
            setIsFollowing(false);
          } else {
            toast({
              title: "Error",
              description: "User not found.",
              variant: "destructive",
            });
            router.push("/dashboard");
          }
          return;
        }

        const profileData = { id: data.id, ...data } as UserProfile;
        setProfile(profileData);
        setFollowersCount(profileData.followers?.length || 0);
        setFollowingCount(profileData.following?.length || 0);
        setIsFollowing(
          profileData.followers?.includes(user?.id || "") || false
        );
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch user profile.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, user, toast, router]);

  // Fetch user's posts with realtime subscription
  useEffect(() => {
    if (!id) return;

    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          const postsData: FeedPost[] = data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            userName: row.user_name,
            userPhoto: row.user_photo,
            userRole: row.user_role,
            userTitle: row.user_title,
            content: row.content,
            imageUrl: row.image_url,
            likes: row.likes || [],
            comments: row.comments || [],
            shares: row.shares || 0,
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          }));
          setPosts(postsData);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchPosts();

    // Realtime subscription for new posts from this user
    const channel = supabase
      .channel(`user-posts-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `user_id=eq.${id}`,
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Follow/unfollow handler
  const handleFollowToggle = useCallback(async () => {
    if (!user || !id || isOwnProfile || !profile) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow: remove user.id from target's followers array
        const newTargetFollowers = (profile.followers || []).filter(
          (uid) => uid !== user.id
        );
        const newMyFollowing = (currentUserProfile?.following || []).filter(
          (uid) => uid !== id
        );

        await supabase
          .from("public_profiles")
          .update({ followers: newTargetFollowers })
          .eq("id", id);

        if (currentUserProfile) {
          await supabase
            .from("public_profiles")
            .update({ following: newMyFollowing })
            .eq("id", user.id);
        }

        setProfile((prev) =>
          prev ? { ...prev, followers: newTargetFollowers } : prev
        );
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
        toast({ title: "Unfollowed" });
      } else {
        // Follow: add user.id to target's followers, add target id to my following
        const newTargetFollowers = Array.from(
          new Set([...(profile.followers || []), user.id])
        );
        const newMyFollowing = Array.from(
          new Set([...(currentUserProfile?.following || []), id])
        );

        await supabase
          .from("public_profiles")
          .update({ followers: newTargetFollowers })
          .eq("id", id);

        if (currentUserProfile) {
          await supabase
            .from("public_profiles")
            .update({ following: newMyFollowing })
            .eq("id", user.id);
        }

        setProfile((prev) =>
          prev ? { ...prev, followers: newTargetFollowers } : prev
        );
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        toast({ title: "Following!" });

        // Send a follow notification directly via Supabase
        try {
          await supabase.from("notifications").insert({
            user_id: id,
            actor_id: user.id,
            actor_name:
              user.displayName || user.email || "Someone",
            actor_photo_url: user.photoURL || null,
            type: "new_follower",
            title: "New Follower",
            message: `${user.displayName || user.email} started following you.`,
            link: `/users/${user.id}`,
            is_read: false,
          });
        } catch (notifError) {
          console.error("Failed to send follow notification:", notifError);
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status.",
        variant: "destructive",
      });
    } finally {
      setFollowLoading(false);
    }
  }, [user, id, isFollowing, isOwnProfile, profile, currentUserProfile, toast]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[60vh]">
        <LumaSpin />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto text-center py-20">
        <h1 className="text-2xl font-bold">User not found</h1>
        <Button variant="link" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const displayName =
    profile.role === "employer"
      ? profile.company_name || profile.display_name
      : profile.display_name ||
        `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
        "User";

  const skillsArray: string[] = Array.isArray(profile.skills)
    ? profile.skills
    : [];

  // Get user's position/title from employment history or headline
  const getPositionTitle = () => {
    if (profile.headline) return profile.headline;
    if (profile.employment_history) {
      const lines = profile.employment_history.split("\n");
      if (lines.length > 0) {
        const firstLine = lines[0].trim();
        if (firstLine.length < 50 && !firstLine.toLowerCase().includes("company")) {
          return firstLine;
        }
      }
    }
    if (skillsArray.length > 0) {
      return `${skillsArray[0]} Professional`;
    }
    return null;
  };

  const portfolioProjects = Array.isArray(profile.portfolio_projects)
    ? profile.portfolio_projects
    : [];

  return (
    <div className="container mx-auto max-w-4xl pb-12">
      {/* Back Button */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card className="rounded-3xl overflow-hidden mb-6">
        {/* Cover Photo */}
        <div className="relative h-48 bg-muted/30">
          {profile.cover_photo && (
            <img
              src={profile.cover_photo}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <CardContent className="relative pt-0 -mt-16 px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* Avatar */}
            <Avatar className="h-32 w-32 border-4 border-card shadow-xl">
              <AvatarImage src={profile.photo_url} alt={displayName} />
              <AvatarFallback className="text-4xl bg-muted text-muted-foreground flex items-center justify-center">
                <User className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>

            {/* Name & Info */}
            <div className="flex-1 md:pb-2">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <p className="text-muted-foreground font-medium">
                {profile.headline ||
                  (profile.role === "employer"
                    ? profile.company_name
                      ? `${profile.company_name}`
                      : "Employer"
                    : getPositionTitle() || "Professional")}
              </p>

              {/* Quick Info Row */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {profile.company_name && profile.role === "employer" && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>{profile.company_name}</span>
                  </div>
                )}
                {profile.education && (
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">
                      {profile.education.split(",")[0]}
                    </span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 md:pb-2">
              {!isOwnProfile ? (
                <>
                  <Button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className="rounded-full"
                    variant={isFollowing ? "outline" : "default"}
                  >
                    {followLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isFollowing ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={async () => {
                      try {
                        const chatId = await startDirectMessage(profile.id, {
                          displayName: displayName,
                          photoURL: profile.photo_url,
                          role: (profile.role as "employer" | "employee") || "employee",
                        });
                        router.push(`/inbox?chat=${chatId}`);
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to start conversation",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="rounded-full" asChild>
                  <Link href="/profile/edit">Edit Profile</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-xl font-bold">{posts.length}</div>
              <div className="text-sm text-muted-foreground">Posts</div>
            </div>
            <div
              className="text-center cursor-pointer hover:text-primary transition-colors"
              onClick={() => {
                setFollowersList(profile.followers || []);
                setFollowersModalOpen(true);
              }}
            >
              <div className="text-xl font-bold">{followersCount}</div>
              <div className="text-sm text-muted-foreground">Followers</div>
            </div>
            <div
              className="text-center cursor-pointer hover:text-primary transition-colors"
              onClick={() => {
                setFollowingList(profile.following || []);
                setFollowingModalOpen(true);
              }}
            >
              <div className="text-xl font-bold">{followingCount}</div>
              <div className="text-sm text-muted-foreground">Following</div>
            </div>
          </div>

          {/* Bio */}
          {profile.career_goals && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">{profile.career_goals}</p>
            </div>
          )}

          {/* Skills */}
          {skillsArray.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {skillsArray.slice(0, 10).map((skill, index) => (
                <Badge key={`${skill}-${index}`} variant="secondary" className="rounded-full">
                  {skill}
                </Badge>
              ))}
              {skillsArray.length > 10 && (
                <Badge variant="outline" className="rounded-full">
                  +{skillsArray.length - 10} more
                </Badge>
              )}
            </div>
          )}

          {/* Links */}
          {(profile.portfolio_link ||
            profile.linkedin ||
            profile.github ||
            profile.twitter ||
            profile.website) && (
            <div className="flex flex-wrap gap-3 mt-4">
              {profile.portfolio_link && (
                <a
                  href={profile.portfolio_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <LinkIcon className="h-4 w-4" />
                  Portfolio
                </a>
              )}
              {profile.linkedin && (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
              {profile.github && (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              )}
              {profile.twitter && (
                <a
                  href={profile.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Twitter className="h-4 w-4" />
                  Twitter
                </a>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-full bg-muted/50 p-1 mb-6">
          <TabsTrigger value="posts" className="rounded-full gap-2">
            <Grid3X3 className="h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="rounded-full gap-2">
            <FolderOpen className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-full gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="about" className="rounded-full gap-2">
            <Users className="h-4 w-4" />
            About
          </TabsTrigger>
        </TabsList>

        {/* Posts Grid Tab */}
        <TabsContent value="posts" className="mt-0">
          {postsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No posts yet</p>
              <p className="text-sm">
                {isOwnProfile
                  ? "Share your first post to get started!"
                  : "This user hasn't posted anything yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="relative group cursor-pointer overflow-hidden rounded-xl bg-card border border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
                >
                  {post.imageUrl ? (
                    <div className="aspect-square">
                      <img
                        src={post.imageUrl}
                        alt="Post"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs line-clamp-2">{post.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square p-4 flex flex-col justify-between bg-gradient-to-br from-primary/10 to-primary/5">
                      <p className="text-sm line-clamp-6">{post.content}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-current" />
                      <span>{post.likes.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-5 w-5" />
                      <span>{post.comments.length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="mt-0">
          {portfolioProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolioProjects.map((project, index) => (
                <Card
                  key={index}
                  className="group overflow-hidden rounded-2xl transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  {project.imageUrl && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardContent className={project.imageUrl ? "pt-4" : "pt-6"}>
                    <h3 className="font-semibold text-lg mb-1">{project.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {project.description}
                    </p>
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Project
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No portfolio items yet</p>
              <p className="text-sm">
                {isOwnProfile
                  ? "Add projects to your profile to showcase your work!"
                  : "This user hasn't added any portfolio items yet."}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-0">
          {posts.length > 0 ? (
            <div className="space-y-3">
              {posts.slice(0, 20).map((post) => (
                <Card key={post.id} className="rounded-2xl">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Grid3X3 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">
                            {profile.display_name || "User"}
                          </span>{" "}
                          shared a post
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {post.likes.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {post.comments.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm">
                {isOwnProfile
                  ? "Your recent activity will show up here."
                  : "This user hasn't had any activity yet."}
              </p>
            </div>
          )}
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="mt-0">
          <Card className="rounded-2xl">
            <CardContent className="pt-6 space-y-6">
              {profile.role === "employer" ? (
                <>
                  {profile.company_overview && (
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <Building className="h-4 w-4 text-primary" />
                        Company Overview
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {profile.company_overview}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {profile.education && (
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        Education
                      </h3>
                      <p className="text-muted-foreground">{profile.education}</p>
                    </div>
                  )}

                  {profile.employment_history && (
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Experience
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {profile.employment_history}
                      </p>
                    </div>
                  )}

                  {profile.interests && (
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        Interests
                      </h3>
                      <p className="text-muted-foreground">{profile.interests}</p>
                    </div>
                  )}

                  {profile.career_goals && (
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-primary" />
                        Career Goals
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {profile.career_goals}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Contact Info */}
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Contact
                </h3>
                <div className="space-y-2 text-sm">
                  {profile.support_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${profile.support_email}`} className="hover:underline">
                        {profile.support_email}
                      </a>
                    </div>
                  )}
                  {profile.contact_number && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{profile.contact_number}</span>
                    </div>
                  )}
                  {!profile.support_email && !profile.contact_number && (
                    <p className="text-sm text-muted-foreground">
                      No contact info available.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Followers Modal */}
      <FollowersModal
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        userIds={followersList}
        title="Followers"
        currentUserId={user?.id || ""}
        currentUserFollowing={currentUserProfile?.following || []}
      />

      {/* Following Modal */}
      <FollowersModal
        isOpen={followingModalOpen}
        onClose={() => setFollowingModalOpen(false)}
        userIds={followingList}
        title="Following"
        currentUserId={user?.id || ""}
        currentUserFollowing={currentUserProfile?.following || []}
      />
    </div>
  );
}
