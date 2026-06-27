// Firebase Admin compatibility layer — redirects to Supabase Admin
// This allows existing server-side code to gradually migrate

import { createSupabaseAdminClient } from './supabase-server';

const adminClient = createSupabaseAdminClient();

// Re-export FieldValue from firestore-compat for server-side usage
export { FieldValue, increment, Timestamp } from './firestore-compat';

export const adminDb = {
  // Firestore compatibility: collection()
  collection(name: string) {
    return {
      // Firestore compat: .where().get()
      where(field: string, op: string, value: any) {
        return {
          async get() {
            let q = adminClient.from(name).select('*');
            if (op === '==') q = q.eq(field, value);
            else if (op === '!=') q = q.neq(field, value);
            else if (op === '>') q = q.gt(field, value);
            else if (op === '<') q = q.lt(field, value);
            else if (op === '>=') q = q.gte(field, value);
            else if (op === '<=') q = q.lte(field, value);
            else if (op === 'array-contains') q = q.contains(field, [value]);
            
            const { data, error } = await q;
            return {
              docs: (data || []).map((doc: any) => ({
                id: doc.id,
                data: () => doc,
                exists: true,
                get: (f: string) => doc[f],
              })),
              empty: !data || data.length === 0,
            };
          },
          // Chain more where clauses
          where(field2: string, op2: string, value2: any) {
            return {
              async get() {
                let q = adminClient.from(name).select('*');
                if (op === '==') q = q.eq(field, value);
                else if (op === '!=') q = q.neq(field, value);
                if (op2 === '==') q = q.eq(field2, value2);
                else if (op2 === '!=') q = q.neq(field2, value2);
                
                const { data, error } = await q;
                return {
                  docs: (data || []).map((doc: any) => ({
                    id: doc.id,
                    data: () => doc,
                    exists: true,
                    get: (f: string) => doc[f],
                  })),
                  empty: !data || data.length === 0,
                };
              },
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
            exists: true,
            get: (f: string) => doc[f],
          })),
          empty: !data || data.length === 0,
        };
      },
    };
  },
  // Firestore compat: .doc(id).get()
  doc(pathOrId: string, ...parts: string[]) {
    let collection: string;
    let id: string;
    
    if (parts.length > 0) {
      // doc("collection", "id") format
      collection = pathOrId;
      id = parts[0];
    } else {
      // doc("collection/id") format
      const pathParts = pathOrId.split('/');
      id = pathParts[pathParts.length - 1];
      collection = pathParts[pathParts.length - 2];
    }

    const docRef = {
      collection,
      id,
      async get() {
        const { data, error } = await adminClient
          .from(collection)
          .select('*')
          .eq('id', id)
          .single();
        return {
          exists: !!data,
          data: () => data,
          id,
          get: (field: string) => data?.[field],
        };
      },
      async set(data: any, options?: any) {
        const record = { id, ...data };
        const { error } = await adminClient
          .from(collection)
          .upsert(record, { onConflict: 'id' });
        if (error) throw error;
        return { id };
      },
      async update(data: any) {
        const { error } = await adminClient
          .from(collection)
          .update(data)
          .eq('id', id);
        if (error) throw error;
        return { id };
      },
      async delete() {
        const { error } = await adminClient
          .from(collection)
          .delete()
          .eq('id', id);
        if (error) throw error;
      },
    };

    return docRef;
  },
  // Simplified transaction support
  async runTransaction(
    updateFunction: (transaction: any) => Promise<any>
  ) {
    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const transaction = {
          get: async (ref: any) => {
            return ref.get();
          },
          set: async (ref: any, data: any, options?: any) => {
            return ref.set(data, options);
          },
          update: async (ref: any, data: any) => {
            return ref.update(data);
          },
          delete: async (ref: any) => {
            return ref.delete();
          },
        };

        return await updateFunction(transaction);
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  },
};

export const adminAuth = null; // No longer needed — Supabase handles auth
