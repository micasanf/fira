"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ============================================
// TYPES
// ============================================

export interface Chat {
  id: string;
  participants: string[];
  hiddenFor?: Record<string, boolean>;
  participantDetails: {
    [userId: string]: {
      displayName: string;
      photoURL?: string;
      role: "employer" | "employee";
    };
  };
  displayName: string;
  photoURL?: string;
  type?: string;
  opportunityId: string;
  opportunityTitle: string;
  applicationId: string;
  createdAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

// ============================================
// HOOK: useChatList
// ============================================

/**
 * Subscribes to the authenticated user's chat list in real-time
 * and tracks unread message counts across all chats.
 * Migrated from Firebase Firestore to Supabase.
 */
export function useChatList(userId: string | undefined) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch chats and subscribe to realtime
  useEffect(() => {
    if (!userId) {
      setChats([]);
      setLoading(false);
      return;
    }

    const fetchChats = async () => {
      try {
        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .contains("participants", [userId])
          .order("last_message_at", { ascending: false });

        if (!error && data) {
          const chatData: Chat[] = data
            .filter((chat: any) => !chat.hidden_for || !chat.hidden_for[userId])
            .map((chat: any) => ({
              id: chat.id,
              participants: chat.participants || [],
              hiddenFor: chat.hidden_for,
              participantDetails: chat.participant_details || {},
              displayName: "",
              type: chat.type,
              opportunityId: chat.opportunity_id || "",
              opportunityTitle: chat.opportunity_title || "",
              applicationId: chat.application_id || "",
              createdAt: chat.created_at,
              lastMessage: chat.last_message,
              lastMessageAt: chat.last_message_at,
            }));

          // Compute display names from participant details
          chatData.forEach((chat) => {
            const otherId = chat.participants.find((p) => p !== userId);
            if (otherId && chat.participantDetails[otherId]) {
              chat.displayName = chat.participantDetails[otherId].displayName || "Unknown";
              chat.photoURL = chat.participantDetails[otherId].photoURL;
            }
          });

          setChats(chatData);
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`chats-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Calculate unread count
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Get all chat IDs for this user
        const chatIds = chats.map((c) => c.id);
        if (chatIds.length === 0) {
          setUnreadCount(0);
          return;
        }

        const { count, error } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .in("chat_id", chatIds)
          .eq("is_read", false)
          .neq("sender_id", userId);

        if (!error) {
          setUnreadCount(count || 0);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();

    // Subscribe to message changes for unread count updates
    const channel = supabase
      .channel(`chat-messages-unread-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chats, userId]);

  return { chats, loading, unreadCount };
}
