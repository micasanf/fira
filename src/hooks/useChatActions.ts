"use client";

import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Attachment } from "./useChatMessages";

// ============================================
// HOOK: useChatActions
// ============================================

/**
 * Provides chat action functions: send message, mark as read,
 * create/get chat, start direct message, and upload attachments.
 * All functions require an authenticated userId.
 * Migrated from Firebase Firestore to Supabase.
 */
export function useChatActions(userId: string | undefined, userEmail: string | undefined) {

  // Upload attachments via the upload API
  const uploadAttachments = useCallback(
    async (chatId: string, files: File[]): Promise<Attachment[]> => {
      const attachments: Attachment[] = [];

      for (const file of files) {
        try {
          const token = (await supabase.auth.getSession()).data.session?.access_token;
          const formData = new FormData();
          formData.append("file", file);
          formData.append("userId", userId || "");
          formData.append("folder", `chats/${chatId}`);

          const response = await fetch("/api/upload", {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            attachments.push({
              name: file.name,
              url: data.url,
              type: file.type.startsWith("image/") ? "image" : "file",
              size: file.size,
            });
          }
        } catch (error) {
          console.error("Error uploading attachment:", error);
        }
      }

      return attachments;
    },
    [userId]
  );

  // Send a message (plain text or encrypted)
  const sendMessage = useCallback(
    async (
      chatId: string,
      text: string,
      files?: File[],
      encryption?: { ciphertext: string; iv: string }
    ) => {
      if (!userId || (!text.trim() && (!files || files.length === 0))) return;

      let attachments: Attachment[] | undefined;
      if (files && files.length > 0) {
        attachments = await uploadAttachments(chatId, files);
      }

      // Build message data
      const messageData: Record<string, unknown> = {
        chat_id: chatId,
        sender_id: userId,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      if (attachments && attachments.length > 0) {
        messageData.attachments = attachments;
      }

      if (encryption) {
        messageData.is_encrypted = true;
        messageData.ciphertext = encryption.ciphertext;
        messageData.iv = encryption.iv;
        messageData.content = "";
      } else {
        messageData.content = text.trim();
      }

      // Insert message
      await supabase.from("chat_messages").insert(messageData);

      // Update last message preview on the chat
      const lastMessageText =
        attachments && attachments.length > 0 && !text.trim()
          ? `📎 ${attachments.length} attachment(s)`
          : text.trim();

      await supabase
        .from("chats")
        .update({
          last_message: lastMessageText,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", chatId);
    },
    [userId, uploadAttachments]
  );

  // Mark all unread messages in a chat as read
  const markAsRead = useCallback(
    async (chatId: string) => {
      if (!userId) return;

      const { data, error } = await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("chat_id", chatId)
        .eq("is_read", false)
        .neq("sender_id", userId);

      if (error) {
        console.error("Error marking messages as read:", error);
      }
    },
    [userId]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (!userId) return;

      // In Supabase, we can hide the chat for this user by removing them from participants
      // or using a hidden_for array. For simplicity, we'll use a soft delete approach.
      // For now, just remove the user from the chat's participants.
      // This is a simplified migration - production would need a hidden_for mechanism.
      const { data: chat } = await supabase
        .from("chats")
        .select("participants")
        .eq("id", chatId)
        .single();

      if (chat) {
        const updatedParticipants = (chat.participants as string[]).filter(
          (p: string) => p !== userId
        );
        if (updatedParticipants.length === 0) {
          await supabase.from("chats").delete().eq("id", chatId);
        } else {
          await supabase
            .from("chats")
            .update({ participants: updatedParticipants })
            .eq("id", chatId);
        }
      }
    },
    [userId]
  );

  // Create or find an existing chat for an application
  const createOrGetChat = useCallback(
    async (
      otherUserId: string,
      opportunityId: string,
      opportunityTitle: string,
      applicationId: string,
      otherUserDetails: {
        displayName: string;
        photoURL?: string;
        role: "employer" | "employee";
      }
    ): Promise<string> => {
      if (!userId) throw new Error("Not authenticated");

      // Check for existing chat (participants contain current user and same application context)
      const { data: existingChats } = await supabase
        .from("chats")
        .select("*")
        .contains("participants", [userId])
        .contains("participants", [otherUserId]);

      if (existingChats && existingChats.length > 0) {
        // Check for a chat with the same application
        const match = existingChats.find((c: any) => c.application_id === applicationId);
        if (match) {
          return match.id;
        }
      }

      // Get current user details
      const { data: currentUserData } = await supabase
        .from("users")
        .select("display_name, photo_url, role")
        .eq("uid", userId)
        .single();

      const currentUserParticipant: {
        displayName: string;
        photoURL?: string;
        role: "employer" | "employee";
      } = {
        displayName: currentUserData?.display_name || userEmail || "Unknown",
        role: currentUserData?.role || "employee",
      };
      if (currentUserData?.photo_url) {
        currentUserParticipant.photoURL = currentUserData.photo_url;
      }

      const otherUserParticipant: {
        displayName: string;
        photoURL?: string;
        role: "employer" | "employee";
      } = {
        displayName: otherUserDetails.displayName,
        role: otherUserDetails.role,
      };
      if (otherUserDetails.photoURL) {
        otherUserParticipant.photoURL = otherUserDetails.photoURL;
      }

      // Create new chat
      const { data: chatRef, error } = await supabase
        .from("chats")
        .insert({
          participants: [userId, otherUserId],
          participant_details: {
            [userId]: currentUserParticipant,
            [otherUserId]: otherUserParticipant,
          },
          opportunity_id: opportunityId,
          opportunity_title: opportunityTitle,
          application_id: applicationId,
          last_message: "",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      return chatRef.id;
    },
    [userId, userEmail]
  );

  // Start a direct message conversation (no opportunity/application needed)
  const startDirectMessage = useCallback(
    async (
      otherUserId: string,
      otherUserDetails: {
        displayName: string;
        photoURL?: string;
        role: "employer" | "employee";
      }
    ): Promise<string> => {
      if (!userId) throw new Error("Not authenticated");

      // Check for existing direct message chat
      const { data: existingChats } = await supabase
        .from("chats")
        .select("*")
        .contains("participants", [userId])
        .contains("participants", [otherUserId])
        .eq("type", "direct");

      if (existingChats && existingChats.length > 0) {
        return existingChats[0].id;
      }

      // Get current user details
      const { data: currentUserData } = await supabase
        .from("users")
        .select("display_name, photo_url, role")
        .eq("uid", userId)
        .single();

      const currentUserParticipant: {
        displayName: string;
        photoURL?: string;
        role: "employer" | "employee";
      } = {
        displayName: currentUserData?.display_name || userEmail || "Unknown",
        role: currentUserData?.role || "employee",
      };
      if (currentUserData?.photo_url) {
        currentUserParticipant.photoURL = currentUserData.photo_url;
      }

      const otherUserParticipant: {
        displayName: string;
        photoURL?: string;
        role: "employer" | "employee";
      } = {
        displayName: otherUserDetails.displayName,
        role: otherUserDetails.role,
      };
      if (otherUserDetails.photoURL) {
        otherUserParticipant.photoURL = otherUserDetails.photoURL;
      }

      const { data: chatRef, error } = await supabase
        .from("chats")
        .insert({
          type: "direct",
          participants: [userId, otherUserId],
          participant_details: {
            [userId]: currentUserParticipant,
            [otherUserId]: otherUserParticipant,
          },
          last_message: "",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      return chatRef.id;
    },
    [userId, userEmail]
  );

  return {
    sendMessage,
    markAsRead,
    deleteChat,
    createOrGetChat,
    startDirectMessage,
  };
}
