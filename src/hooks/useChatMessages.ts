"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ============================================
// TYPES
// ============================================

export interface Attachment {
  name: string;
  url: string;
  type: "image" | "file";
  size: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
  attachments?: Attachment[];
  encrypted?: boolean;
  ciphertext?: string;
  iv?: string;
}

// ============================================
// HOOK: useChatMessages
// ============================================

/**
 * Subscribes to messages for the active chat in real-time.
 * Automatically marks unread messages from others as read.
 * Migrated from Firebase Firestore to Supabase.
 */
export function useChatMessages(
  activeChatId: string | null,
  currentUserId?: string
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Mark unread messages as read when chat is opened
  const markAsRead = useCallback(
    async (chatId: string) => {
      if (!currentUserId || !chatId) return;

      try {
        const { error } = await supabase
          .from("chat_messages")
          .update({ is_read: true })
          .eq("chat_id", chatId)
          .eq("is_read", false)
          .neq("sender_id", currentUserId);

        if (error) {
          console.error("Error marking messages as read:", error);
        }
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    },
    [currentUserId]
  );

  // Fetch messages and subscribe to realtime
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);

    // Mark existing unread messages as read
    if (currentUserId) {
      markAsRead(activeChatId);
    }

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("chat_id", activeChatId)
          .order("created_at", { ascending: true });

        if (!error && data) {
          const messageData: Message[] = data.map((row: any) => ({
            id: row.id,
            senderId: row.sender_id,
            text: row.content || "",
            timestamp: row.created_at,
            read: row.is_read ?? false,
            attachments: row.attachments || undefined,
            encrypted: row.is_encrypted ?? false,
            ciphertext: row.ciphertext,
            iv: row.iv,
          }));
          setMessages(messageData);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`chat-messages-${activeChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${activeChatId}`,
        },
        (payload) => {
          const row = payload.new as any;
          const newMessage: Message = {
            id: row.id,
            senderId: row.sender_id,
            text: row.content || "",
            timestamp: row.created_at,
            read: row.is_read ?? false,
            attachments: row.attachments || undefined,
            encrypted: row.is_encrypted ?? false,
            ciphertext: row.ciphertext,
            iv: row.iv,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          // Mark incoming messages as read
          if (currentUserId && newMessage.senderId !== currentUserId && !newMessage.read) {
            markAsRead(activeChatId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${activeChatId}`,
        },
        (payload) => {
          const row = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id
                ? {
                    ...m,
                    read: row.is_read ?? m.read,
                    text: row.content ?? m.text,
                  }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatId, currentUserId, markAsRead]);

  return { messages, messagesLoading, markAsRead };
}
