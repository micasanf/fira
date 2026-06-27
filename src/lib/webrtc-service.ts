"use client";

import { supabase } from "@/lib/supabase";

// ICE servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

// Types
export interface CallData {
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  opportunityId?: string;
  opportunityTitle?: string;
  status: "ringing" | "active" | "ended" | "rejected";
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  createdAt: string;
}

export interface CallCallbacks {
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onCallEnded: () => void;
}

/**
 * WebRTC Call Manager - handles a single video call
 * Migrated from Firebase Firestore to Supabase
 */
export class WebRTCCall {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private unsubscribers: (() => void)[] = [];
  private isCleanedUp = false;

  constructor(
    private callId: string,
    private userId: string,
    private isCaller: boolean,
    private callbacks: CallCallbacks
  ) {}

  /**
   * Initialize media (camera + microphone)
   */
  async getMedia(video: boolean = true, audio: boolean = true): Promise<MediaStream | null> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video, audio });
      this.callbacks.onLocalStream(this.localStream);
      return this.localStream;
    } catch (error) {
      console.error("[WebRTC] Failed to get media:", error);
      return null;
    }
  }

  /**
   * Create peer connection and set up event handlers
   */
  private createPeerConnection(): RTCPeerConnection {
    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    // Handle incoming tracks
    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
      this.callbacks.onRemoteStream(this.remoteStream!);
    };

    // Handle ICE candidates - save to Supabase
    this.pc.onicecandidate = async (event) => {
      if (event.candidate && !this.isCleanedUp) {
        const table = this.isCaller ? "caller_ice_candidates" : "callee_ice_candidates";
        await supabase.from(table).insert({
          call_id: this.callId,
          candidate: JSON.stringify(event.candidate.toJSON()),
        });
      }
    };

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        this.callbacks.onConnectionStateChange(this.pc.connectionState);
      }
    };

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    return this.pc;
  }

  /**
   * Start a call (caller side)
   */
  async startCall(
    callerName: string,
    calleeId: string,
    calleeName: string,
    opportunityId?: string,
    opportunityTitle?: string
  ): Promise<void> {
    if (this.isCleanedUp) return;

    // Create peer connection
    this.createPeerConnection();

    // Create offer
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);

    // Save call to Supabase with status "ringing"
    await supabase.from("calls").insert({
      id: this.callId,
      caller_id: this.userId,
      caller_name: callerName,
      callee_id: calleeId,
      callee_name: calleeName,
      opportunity_id: opportunityId || null,
      opportunity_title: opportunityTitle || null,
      status: "ringing",
      offer: { type: offer.type, sdp: offer.sdp },
      started_at: new Date().toISOString(),
    });

    // Listen for answer via realtime
    const callChannel = supabase
      .channel(`call-${this.callId}-answer`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${this.callId}`,
        },
        async (payload) => {
          const data = payload.new as any;
          if (data?.answer && this.pc && !this.pc.currentRemoteDescription) {
            await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
          if (data?.status === "ended" || data?.status === "rejected") {
            this.callbacks.onCallEnded();
          }
        }
      )
      .subscribe();
    this.unsubscribers.push(() => supabase.removeChannel(callChannel));

    // Listen for callee's ICE candidates via realtime
    const candidatesChannel = supabase
      .channel(`call-${this.callId}-callee-candidates`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'callee_ice_candidates',
          filter: `call_id=eq.${this.callId}`,
        },
        async (payload) => {
          if (this.pc) {
            try {
              const candidateData = JSON.parse(payload.new.candidate);
              await this.pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (e) {
              console.error('[WebRTC] Error adding ICE candidate:', e);
            }
          }
        }
      )
      .subscribe();
    this.unsubscribers.push(() => supabase.removeChannel(candidatesChannel));
  }

  /**
   * Answer a call (callee side)
   */
  async answerCall(): Promise<void> {
    if (this.isCleanedUp) return;

    // Get call data first
    let hasAnswered = false; // Guard to prevent processing multiple times
    
    return new Promise((resolve, reject) => {
      // First, fetch the call data
      const fetchAndListen = async () => {
        const { data: callData } = await supabase
          .from("calls")
          .select("*")
          .eq("id", this.callId)
          .single();

        if (callData?.offer && !hasAnswered && !this.isCleanedUp) {
          hasAnswered = true;
          await this.processAnswer(callData);
          resolve();
        }
      };

      fetchAndListen();

      // Also subscribe for updates in case the offer isn't there yet
      const channel = supabase
        .channel(`call-${this.callId}-offer`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'calls',
            filter: `id=eq.${this.callId}`,
          },
          async (payload) => {
            if (hasAnswered || this.isCleanedUp) return;
            const data = payload.new as any;
            if (!data?.offer) return;

            hasAnswered = true;
            await this.processAnswer(data);
            supabase.removeChannel(channel);
            resolve();
          }
        )
        .subscribe();

      this.unsubscribers.push(() => supabase.removeChannel(channel));
    });
  }

  private async processAnswer(callData: any): Promise<void> {
    // Create peer connection
    this.createPeerConnection();

    // Set remote description from offer
    await this.pc!.setRemoteDescription(new RTCSessionDescription(callData.offer));

    // Create and set answer
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);

    // Save answer to Supabase
    await supabase
      .from("calls")
      .update({
        answer: { type: answer.type, sdp: answer.sdp },
        status: "active",
      })
      .eq("id", this.callId);

    // Listen for caller's ICE candidates
    const callerCandidatesChannel = supabase
      .channel(`call-${this.callId}-caller-candidates`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'caller_ice_candidates',
          filter: `call_id=eq.${this.callId}`,
        },
        async (payload) => {
          if (this.pc) {
            try {
              const candidateData = JSON.parse(payload.new.candidate);
              await this.pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (e) {
              console.error('[WebRTC] Error adding ICE candidate:', e);
            }
          }
        }
      )
      .subscribe();
    this.unsubscribers.push(() => supabase.removeChannel(callerCandidatesChannel));

    // Listen for call status changes
    const statusChannel = supabase
      .channel(`call-${this.callId}-status`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${this.callId}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (data?.status === "ended") {
            this.callbacks.onCallEnded();
          }
        }
      )
      .subscribe();
    this.unsubscribers.push(() => supabase.removeChannel(statusChannel));
  }

  /**
   * End the call and cleanup
   */
  async endCall(): Promise<void> {
    if (this.isCleanedUp) return;
    this.isCleanedUp = true;

    // Update Supabase
    try {
      await supabase
        .from("calls")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", this.callId);
    } catch (error) {
      console.error("[WebRTC] Error updating call status:", error);
    }

    this.cleanup();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.isCleanedUp = true;

    // Unsubscribe from all listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.remoteStream = null;
  }

  /**
   * Toggle video
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle audio
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }
}

/**
 * Generate a unique call ID
 */
export function generateCallId(callerId: string, calleeId: string): string {
  return `${callerId}_${calleeId}_${Date.now()}`;
}

/**
 * Listen for incoming calls
 */
export function listenForIncomingCalls(
  userId: string,
  onIncomingCall: (callData: CallData & { callId: string }) => void
): () => void {
  // Track calls we've already notified about to avoid duplicates
  const notifiedCalls = new Set<string>();

  // Initial fetch for existing ringing calls
  const fetchRingingCalls = async () => {
    const { data, error } = await supabase
      .from("calls")
      .select("*")
      .eq("callee_id", userId)
      .eq("status", "ringing");

    if (!error && data) {
      for (const call of data) {
        if (!notifiedCalls.has(call.id)) {
          const ageSeconds = call.created_at
            ? (Date.now() - new Date(call.created_at).getTime()) / 1000
            : 61;
          
          if (ageSeconds <= 60) {
            notifiedCalls.add(call.id);
            onIncomingCall({
              callId: call.id,
              callerId: call.caller_id,
              callerName: call.caller_name,
              calleeId: call.callee_id,
              calleeName: call.callee_name,
              opportunityId: call.opportunity_id,
              opportunityTitle: call.opportunity_title,
              status: call.status,
              offer: call.offer,
              createdAt: call.created_at,
            });
          }
        }
      }
    }
  };

  fetchRingingCalls();

  // Subscribe to new calls via realtime
  const channel = supabase
    .channel(`incoming-calls-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `callee_id=eq.${userId}`,
      },
      (payload) => {
        const data = payload.new as any;
        const callId = data.id;

        if (data.callee_id === userId && data.status === "ringing" && !notifiedCalls.has(callId)) {
          const ageSeconds = data.created_at
            ? (Date.now() - new Date(data.created_at).getTime()) / 1000
            : 61;

          if (ageSeconds <= 60) {
            notifiedCalls.add(callId);
            onIncomingCall({
              callId: data.id,
              callerId: data.caller_id,
              callerName: data.caller_name,
              calleeId: data.callee_id,
              calleeName: data.callee_name,
              opportunityId: data.opportunity_id,
              opportunityTitle: data.opportunity_title,
              status: data.status,
              offer: data.offer,
              createdAt: data.created_at,
            });
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
