"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChatProvider, useChat, Chat } from "@/context/ChatContext";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function ChatRoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, userProfile } = useAuth();
  const {
    chats,
    loading: chatsLoading,
    activeChat,
    setActiveChat,
    createOrGetChat,
  } = useChat();
  const [creating, setCreating] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const processedRef = useRef(false);
  const activatedRef = useRef(false);

  const chatId = params.chatId as string;

  // Determine back link based on user role
  const isEmployer = userProfile?.role === "employer";
  const backLink = isEmployer
    ? activeChat?.opportunityId
      ? `/employer/postings/${activeChat.opportunityId}/applicants`
      : "/employer/postings"
    : "/applications";
  const backLabel = isEmployer ? "Back to Applicants" : "Back to Applications";

  // Function to load chat directly from Supabase if not in context
  const loadChatDirectly = useCallback(async (id: string): Promise<Chat | null> => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) return null;

      // Shape the row into the Chat interface used by the context
      const participants: string[] = data.participants || [];
      const participantDetails = data.participant_details || {};
      const otherId = participants.find((p) => p !== user.id);
      const displayName =
        (otherId && participantDetails[otherId]?.displayName) || "Unknown";
      const photoURL = otherId ? participantDetails[otherId]?.photoURL : undefined;

      return {
        id: data.id,
        participants,
        hiddenFor: data.hidden_for,
        participantDetails,
        displayName,
        photoURL,
        type: data.type,
        opportunityId: data.opportunity_id || "",
        opportunityTitle: data.opportunity_title || "",
        applicationId: data.application_id || "",
        createdAt: data.created_at,
        lastMessage: data.last_message,
        lastMessageAt: data.last_message_at,
      } as Chat;
    } catch (error) {
      console.error("Error loading chat:", error);
      return null;
    }
  }, [user?.id]);

  // Set active chat based on URL - either from context or load directly
  useEffect(() => {
    if (chatsLoading || !chatId || chatId === "new" || activatedRef.current) return;

    // First try to find in existing chats
    const existingChat = chats.find((c) => c.id === chatId);
    if (existingChat) {
      setActiveChat(existingChat);
      activatedRef.current = true;
      return;
    }

    // If not found in context, load directly from Supabase
    const loadChat = async () => {
      setLoadingChat(true);
      const chat = await loadChatDirectly(chatId);
      if (chat) {
        setActiveChat(chat);
        activatedRef.current = true;
      }
      setLoadingChat(false);
    };

    loadChat();
  }, [chatId, chats, chatsLoading, setActiveChat, loadChatDirectly]);

  // Create new chat from URL params
  useEffect(() => {
    const createNewChat = async () => {
      if (chatId !== "new" || !user || processedRef.current || creating) return;

      const userId = searchParams.get("userId");
      const userName = searchParams.get("userName");
      const opportunityId = searchParams.get("opportunityId");
      const opportunityTitle = searchParams.get("opportunityTitle");
      const applicationId = searchParams.get("applicationId");

      if (userId && opportunityId && opportunityTitle && applicationId && userName) {
        processedRef.current = true;
        setCreating(true);
        try {
          const newChatId = await createOrGetChat(
            userId,
            opportunityId,
            opportunityTitle,
            applicationId,
            {
              displayName: userName,
              photoURL: searchParams.get("userPhoto") || undefined,
              role: "employee",
            }
          );

          // Reset activation ref for the new chat ID
          activatedRef.current = false;

          // Navigate to the actual chat room
          router.replace(`/chat/${newChatId}`);
        } catch (error) {
          console.error("Error creating chat:", error);
          processedRef.current = false;
        } finally {
          setCreating(false);
        }
      }
    };

    createNewChat();
  }, [chatId, user, searchParams, createOrGetChat, router, creating]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/?auth=login&redirect=/chat/" + chatId);
    }
  }, [user, authLoading, router, chatId]);

  if (authLoading || creating || loadingChat) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="border-b border-border">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backLink}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backLabel}
          </Link>
        </Button>
      </div>

      {/* Chat Window */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow />
      </div>
    </div>
  );
}

export default function ChatRoomPage() {
  return (
    <ChatProvider>
      <ChatRoomContent />
    </ChatProvider>
  );
}
