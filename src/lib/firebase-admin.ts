// Firebase Admin compatibility layer — redirects to Supabase Admin
// This allows existing server-side code to gradually migrate

import { createSupabaseAdminClient } from './supabase-server';

const adminClient = createSupabaseAdminClient();

export const adminDb = {
  // Firestore compatibility: collection()
  collection(name: string) {
    return {
      // Firestore compat: .where().get()
      where(field: string, op: string, value: any) {
        return {
          async get() {
            let query = adminClient.from(name).select('*');
            if (op === '==') {
              query = query.eq(field, value);
            }
            const { data, error } = await query;
            return {
              docs: (data || []).map((doc: any) => ({
                id: doc.id,
                data: () => doc,
                exists: !!doc,
              })),
              empty: !data || data.length === 0,
            };
          },
        };
      },
      async get() {
        const { data, error } = await adminClient.from(name).select('*');
        return {
          docs: (data || []).map((doc: any) => ({
            id: doc.id,
            data: () => doc,
            exists: !!doc,
          })),
          empty: !data || data.length === 0,
        };
      },
    };
  },
  // Firestore compat: .doc(id).get()
  doc(path: string) {
    const parts = path.split('/');
    const id = parts[parts.length - 1];
    const collection = parts[parts.length - 2];
    return {
      async get() {
        const { data, error } = await adminClient
          .from(collection)
          .select('*')
          .eq('uid', id)
          .single();
        return {
          exists: !!data,
          data: () => data,
          id,
        };
      },
      async set(data: any, options?: any) {
        const { error } = await adminClient
          .from(collection)
          .upsert({ uid: id, ...data }, { onConflict: 'uid' });
        return { id };
      },
      async update(data: any) {
        const { error } = await adminClient
          .from(collection)
          .update(data)
          .eq('uid', id);
        return { id };
      },
    };
  },
};

export const adminAuth = null; // No longer needed — Supabase handles auth
