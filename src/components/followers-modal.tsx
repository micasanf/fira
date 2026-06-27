"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, User, UserPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserData {
  uid: string;
  displayName: string;
  photoURL?: string;
  headline?: string;
  role: "employee" | "employer";
}

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userIds: string[];
  title: string;
  currentUserId: string;
  currentUserFollowing: string[];
}

export function FollowersModal({
  isOpen,
  onClose,
  userIds,
  title,
  currentUserId,
  currentUserFollowing,
}: FollowersModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>(currentUserFollowing);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    setFollowingIds(currentUserFollowing);
  }, [currentUserFollowing]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOpen || userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userData: UserData[] = [];

      try {
        // Batch fetch using Supabase 'in' query
        const { data, error } = await supabase
          .from("public_profiles")
          .select("*")
          .in("uid", userIds);

        if (!error && data) {
          for (const profile of data) {
            userData.push({
              uid: profile.uid,
              displayName: profile.display_name || profile.company_name || "Unknown User",
              photoURL: profile.photo_url,
              headline: profile.headline || (profile.role === "employer" ? "Employer" : ""),
              role: profile.role || "employee",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }

      setUsers(userData);
      setLoading(false);
    };

    fetchUsers();
  }, [isOpen, userIds]);

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;

    setFollowLoading(targetUserId);

    try {
      const isCurrentlyFollowing = followingIds.includes(targetUserId);

      if (isCurrentlyFollowing) {
        // Unfollow - remove from followers table
        await supabase
          .from("followers")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
      } else {
        // Follow - add to followers table
        await supabase.from("followers").insert({
          follower_id: user.id,
          following_id: targetUserId,
        });
      }

      // Update local state
      if (isCurrentlyFollowing) {
        setFollowingIds((prev) => prev.filter((id) => id !== targetUserId));
      } else {
        setFollowingIds((prev) => [...prev, targetUserId]);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setFollowLoading(null);
    }
  };

  const handleUserClick = (userId: string) => {
    onClose();
    router.push(`/users/${userId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No users to show</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((userData) => {
                const isFollowing = followingIds.includes(userData.uid);
                const isOwnProfile = userData.uid === currentUserId;

                return (
                  <div
                    key={userData.uid}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => handleUserClick(userData.uid)}
                    >
                      <AvatarImage src={userData.photoURL} />
                      <AvatarFallback className="bg-muted">
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleUserClick(userData.uid)}
                    >
                      <p className="font-medium truncate hover:underline">
                        {userData.displayName}
                      </p>
                      {userData.headline && (
                        <p className="text-sm text-muted-foreground truncate">
                          {userData.headline}
                        </p>
                      )}
                    </div>

                    {!isOwnProfile && user && (
                      <Button
                        variant={isFollowing ? "outline" : "default"}
                        size="sm"
                        className="rounded-full shrink-0"
                        onClick={() => handleFollow(userData.uid)}
                        disabled={followLoading === userData.uid}
                      >
                        {followLoading === userData.uid ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isFollowing ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
