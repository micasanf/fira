"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  importPrivateKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  isCryptoSupported,
} from "@/lib/crypto";
import {
  storeKeys,
  getKeys,
  hasKeys,
  isIndexedDBSupported,
} from "@/lib/key-storage";

// ============================================
// TYPES
// ============================================

interface EncryptionContextType {
  isReady: boolean;
  isSupported: boolean;
  publicKey: string | null;
  encrypt: (message: string, recipientId: string) => Promise<{ ciphertext: string; iv: string } | null>;
  decrypt: (ciphertext: string, iv: string, senderId: string) => Promise<string | null>;
  ensureKeys: () => Promise<boolean>;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [sharedKeyCache, setSharedKeyCache] = useState<Map<string, CryptoKey>>(new Map());

  const isSupported = typeof window !== "undefined" && isCryptoSupported() && isIndexedDBSupported();

  // Initialize keys when user logs in
  useEffect(() => {
    if (!user?.id || !isSupported) {
      setIsReady(false);
      setPublicKey(null);
      setPrivateKey(null);
      return;
    }

    const initializeKeys = async () => {
      try {
        // Check if we have keys in IndexedDB
        const storedKeys = await getKeys(user.id);
        
        if (storedKeys) {
          // Import existing keys
          const importedPrivate = await importPrivateKey(storedKeys.privateKey);
          setPrivateKey(importedPrivate);
          setPublicKey(storedKeys.publicKey);
          setIsReady(true);
        } else {
          // Check if there's a public key in Supabase but we lost the private key
          const { data: userData } = await supabase
            .from("users")
            .select("encryption_public_key")
            .eq("uid", user.id)
            .single();
          
          if (userData?.encryption_public_key) {
            // We have a public key but no private key - need to regenerate
            console.warn("Private key lost, needs regeneration");
            setIsReady(false);
          } else {
            // No keys exist yet, will be generated on first message
            setIsReady(false);
          }
        }
      } catch (error) {
        console.error("Error initializing encryption:", error);
        setIsReady(false);
      }
    };

    initializeKeys();
  }, [user?.id, isSupported]);

  // Ensure keys exist (generate if needed)
  const ensureKeys = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !isSupported) return false;
    
    if (privateKey && publicKey) return true;

    try {
      // Generate new key pair
      const keyPair = await generateKeyPair();
      const exportedPublic = await exportPublicKey(keyPair.publicKey);
      const exportedPrivate = await exportPrivateKey(keyPair.privateKey);

      // Store in IndexedDB
      await storeKeys(user.id, exportedPublic, exportedPrivate);

      // Store public key in Supabase - users table
      await supabase
        .from("users")
        .upsert(
          { uid: user.id, encryption_public_key: exportedPublic },
          { onConflict: "uid" }
        );

      // Store public key in public_profiles table
      await supabase
        .from("public_profiles")
        .upsert(
          { uid: user.id, encryption_public_key: exportedPublic, updated_at: new Date().toISOString() },
          { onConflict: "uid" }
        );

      setPrivateKey(keyPair.privateKey);
      setPublicKey(exportedPublic);
      setIsReady(true);

      return true;
    } catch (error) {
      console.error("Error generating keys:", error);
      return false;
    }
  }, [user?.id, isSupported, privateKey, publicKey]);

  // Get or derive shared key for a specific user
  const getSharedKey = useCallback(async (otherUserId: string): Promise<CryptoKey | null> => {
    if (!privateKey) return null;

    // Check cache
    const cached = sharedKeyCache.get(otherUserId);
    if (cached) return cached;

    try {
      // Get other user's public key from Supabase
      const { data: otherUserData } = await supabase
        .from("public_profiles")
        .select("encryption_public_key")
        .eq("uid", otherUserId)
        .single();
      
      if (!otherUserData?.encryption_public_key) {
        console.warn("Other user has no encryption key");
        return null;
      }

      // Import their public key and derive shared key
      const otherPublicKey = await importPublicKey(otherUserData.encryption_public_key);
      const sharedKey = await deriveSharedKey(privateKey, otherPublicKey);

      // Cache it
      setSharedKeyCache(prev => new Map(prev).set(otherUserId, sharedKey));

      return sharedKey;
    } catch (error) {
      console.error("Error deriving shared key:", error);
      return null;
    }
  }, [privateKey, sharedKeyCache]);

  // Encrypt a message for a recipient
  const encrypt = useCallback(async (
    message: string,
    recipientId: string
  ): Promise<{ ciphertext: string; iv: string } | null> => {
    if (!isReady) {
      const ready = await ensureKeys();
      if (!ready) return null;
    }

    const sharedKey = await getSharedKey(recipientId);
    if (!sharedKey) return null;

    try {
      return await encryptMessage(message, sharedKey);
    } catch (error) {
      console.error("Error encrypting message:", error);
      return null;
    }
  }, [isReady, ensureKeys, getSharedKey]);

  // Decrypt a message from a sender
  const decrypt = useCallback(async (
    ciphertext: string,
    iv: string,
    senderId: string
  ): Promise<string | null> => {
    if (!isReady || !privateKey) return null;

    const sharedKey = await getSharedKey(senderId);
    if (!sharedKey) return null;

    try {
      return await decryptMessage(ciphertext, iv, sharedKey);
    } catch (error) {
      console.error("Error decrypting message:", error);
      return null;
    }
  }, [isReady, privateKey, getSharedKey]);

  return (
    <EncryptionContext.Provider
      value={{
        isReady,
        isSupported,
        publicKey,
        encrypt,
        decrypt,
        ensureKeys,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useEncryption() {
  const context = useContext(EncryptionContext);
  if (context === undefined) {
    throw new Error("useEncryption must be used within an EncryptionProvider");
  }
  return context;
}
