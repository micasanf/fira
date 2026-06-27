/**
 * Firestore-to-Supabase Compatibility Layer
 * 
 * This provides Firestore-like APIs backed by Supabase.
 * Allows gradual migration — existing Firestore-style code works
 * while we rewrite to native Supabase queries.
 * 
 * All tables use `id` as the primary key column.
 * The `users` table's `id` is the Supabase Auth UID.
 */

import { supabase } from './supabase';

// ============ Special Value Markers ============
// These are used in updateDoc() to represent atomic operations

interface ArrayUnionMarker {
  __type: 'arrayUnion';
  elements: any[];
}

interface ArrayRemoveMarker {
  __type: 'arrayRemove';
  elements: any[];
}

interface IncrementMarker {
  __type: 'increment';
  value: number;
}

export function arrayUnion(...elements: any[]): ArrayUnionMarker {
  return { __type: 'arrayUnion', elements };
}

export function arrayRemove(...elements: any[]): ArrayRemoveMarker {
  return { __type: 'arrayRemove', elements };
}

export function increment(value: number = 1): IncrementMarker {
  return { __type: 'increment', value };
}

// ============ FieldValue compat (firebase-admin/firestore) ============

export const FieldValue = {
  increment: (n: number = 1) => increment(n),
  arrayUnion: (...elements: any[]) => arrayUnion(...elements),
  arrayRemove: (...elements: any[]) => arrayRemove(...elements),
  serverTimestamp: () => new Date().toISOString(),
  delete: () => null, // Field delete - in Supabase, set to null
};

// ============ Query Builders ============

// doc() supports multiple patterns:
// - doc(db, "users", userId) → { collection: "users", id: userId }
// - doc(db, "users", userId, "applications", appId) → subcollection pattern
export function doc(_db: any, ...args: string[]) {
  if (args.length === 2) {
    // Simple: doc(db, "collection", "id")
    return { collection: args[0], id: args[1] };
  }
  if (args.length === 4) {
    // Subcollection: doc(db, "parentCollection", "parentId", "subCollection", "subId")
    // Map to: { collection: "subCollection", id: "subId", parentId: args[1], parentCollection: args[0] }
    return { collection: args[2], id: args[3], parentId: args[1], parentCollection: args[0] };
  }
  // Fallback
  return { collection: args[0], id: args[1] };
}

// collection() supports multiple patterns:
// - collection(db, "users") → { collection: "users" }
// - collection(db, "users", userId, "applications") → subcollection pattern
export function collection(_db: any, ...args: string[]) {
  if (args.length === 1) {
    return { collection: args[0] };
  }
  if (args.length === 3) {
    // Subcollection: collection(db, "parentCollection", "parentId", "subCollection")
    // Map to: { collection: "subCollection", parentId: args[1], parentCollection: args[0] }
    return { collection: args[2], parentId: args[1], parentCollection: args[0] };
  }
  return { collection: args[0] };
}

// ============ Get Operations ============

export async function getDoc(ref: any) {
  if (!ref.id) throw new Error('Document ID required');
  
  let q = supabase.from(ref.collection).select('*').eq('id', ref.id);
  
  // Add parent filter for subcollection patterns
  if (ref.parentId && ref.parentCollection) {
    const parentField = ref.parentCollection === 'users' ? 'userId' : `${ref.parentCollection}Id`;
    q = q.eq(parentField, ref.parentId);
  }
  
  const { data, error } = await q.single();
  
  return {
    exists: () => !!data,
    data: () => data,
    id: ref.id,
    get: (field: string) => data?.[field],
  };
}

export async function getDocs(queryRef: any) {
  let q = supabase.from(queryRef.collection || queryRef.table).select('*');
  
  // Add parent filter for subcollection patterns
  if (queryRef.parentId && queryRef.parentCollection) {
    const parentField = queryRef.parentCollection === 'users' ? 'userId' : `${queryRef.parentCollection}Id`;
    q = q.eq(parentField, queryRef.parentId);
  }
  
  // Apply filters if any
  if (queryRef.filters) {
    for (const f of queryRef.filters) {
      if (f.op === '==') q = q.eq(f.field, f.value);
      else if (f.op === '!=') q = q.neq(f.field, f.value);
      else if (f.op === '>') q = q.gt(f.field, f.value);
      else if (f.op === '<') q = q.lt(f.field, f.value);
      else if (f.op === '>=') q = q.gte(f.field, f.value);
      else if (f.op === '<=') q = q.lte(f.field, f.value);
      else if (f.op === 'in') q = q.in(f.field, f.value);
      else if (f.op === 'array-contains') q = q.contains(f.field, [f.value]);
    }
  }
  
  // Apply ordering
  if (queryRef.orders) {
    for (const o of queryRef.orders) {
      q = q.order(o.field, { ascending: o.ascending });
    }
  }
  
  // Apply limit
  if (queryRef.limitCount) {
    q = q.limit(queryRef.limitCount);
  }
  
  const { data, error } = await q;
  
  return {
    docs: (data || []).map((doc: any) => ({
      id: doc.id,
      data: () => doc,
      exists: true,
      get: (field: string) => doc[field],
    })),
    empty: !data || data.length === 0,
    size: data?.length || 0,
  };
}

// ============ Write Operations ============

export async function setDoc(
  ref: any,
  data: any,
  options?: { merge?: boolean }
) {
  if (!ref.id) throw new Error('Document ID required');
  
  let record = { id: ref.id, ...data };
  
  // Add parent reference for subcollection patterns
  if (ref.parentId && ref.parentCollection) {
    const parentField = ref.parentCollection === 'users' ? 'userId' : `${ref.parentCollection}Id`;
    record[parentField] = ref.parentId;
  }
  
  const { error } = await supabase
    .from(ref.collection)
    .upsert(record, { onConflict: 'id' });
  
  if (error) throw error;
  return { id: ref.id };
}

export async function addDoc(
  ref: any,
  data: any
) {
  let record = { ...data };
  
  // Add parent reference for subcollection patterns
  if (ref.parentId && ref.parentCollection) {
    const parentField = ref.parentCollection === 'users' ? 'userId' : `${ref.parentCollection}Id`;
    record[parentField] = ref.parentId;
  }
  
  const { data: result, error } = await supabase
    .from(ref.collection)
    .insert(record)
    .select()
    .single();
  
  if (error) throw error;
  return { id: result?.id };
}

// Helper: apply special markers to update data
async function applySpecialMarkers(
  collection: string,
  id: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  const processedData: Record<string, any> = {};
  let needsRead = false;

  // Check if any values are special markers
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      if (value.__type === 'arrayUnion' || value.__type === 'arrayRemove' || value.__type === 'increment') {
        needsRead = true;
        break;
      }
    }
  }

  let currentData: Record<string, any> | null = null;

  if (needsRead) {
    const { data: existing } = await supabase
      .from(collection)
      .select('*')
      .eq('id', id)
      .single();
    currentData = existing;
  }

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      if (value.__type === 'arrayUnion') {
        // Append elements to array
        const currentArray = currentData?.[key] || [];
        processedData[key] = [...currentArray, ...value.elements];
      } else if (value.__type === 'arrayRemove') {
        // Remove elements from array
        const currentArray = currentData?.[key] || [];
        processedData[key] = currentArray.filter(
          (item: any) => !value.elements.some(el => JSON.stringify(el) === JSON.stringify(item))
        );
      } else if (value.__type === 'increment') {
        // Increment numeric value
        const currentVal = currentData?.[key] || 0;
        processedData[key] = currentVal + value.value;
      } else {
        processedData[key] = value;
      }
    } else {
      processedData[key] = value;
    }
  }

  return processedData;
}

export async function updateDoc(
  ref: any,
  data: any
) {
  if (!ref.id) throw new Error('Document ID required');
  
  const processedData = await applySpecialMarkers(ref.collection, ref.id, data);
  
  let q = supabase.from(ref.collection).update(processedData).eq('id', ref.id);
  
  // Add parent filter for subcollection patterns
  if (ref.parentId && ref.parentCollection) {
    const parentField = ref.parentCollection === 'users' ? 'userId' : `${ref.parentCollection}Id`;
    q = q.eq(parentField, ref.parentId);
  }
  
  const { error } = await q;
  if (error) throw error;
}

export async function deleteDoc(
  ref: any
) {
  if (!ref.id) throw new Error('Document ID required');
  
  let q = supabase.from(ref.collection).delete().eq('id', ref.id);
  
  // Add parent filter for subcollection patterns
  if (ref.parentId && ref.parentCollection) {
    const parentField = ref.parentCollection === 'users' ? 'userId' : `${ref.parentCollection}Id`;
    q = q.eq(parentField, ref.parentId);
  }
  
  const { error } = await q;
  if (error) throw error;
}

// ============ Query Builder ============

export function query(ref: any, ...constraints: any[]) {
  let result = { ...ref, filters: ref.filters ? [...ref.filters] : [], orders: ref.orders ? [...ref.orders] : [] };
  
  for (const constraint of constraints) {
    if (constraint.type === 'where') {
      result.filters.push(constraint);
    } else if (constraint.type === 'orderBy') {
      result.orders.push(constraint);
    } else if (constraint.type === 'limit') {
      result.limitCount = constraint.count;
    }
  }
  
  return result;
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction?: string) {
  return { type: 'orderBy', field, ascending: direction !== 'desc' };
}

export function limit(count: number) {
  return { type: 'limit', count };
}

// ============ Timestamp ============

export const serverTimestamp = () => new Date().toISOString();

export const Timestamp = {
  now: () => new Date().toISOString(),
  fromDate: (date: Date) => date.toISOString(),
  fromMillis: (ms: number) => new Date(ms).toISOString(),
  toDate: (isoString: string) => new Date(isoString),
};

// ============ Realtime ============

export function onSnapshot(
  ref: any,
  callback: (snapshot: any) => void,
  errorCallback?: (error: any) => void
) {
  // For document snapshots
  if (ref.id && !ref.parentId) {
    const channel = supabase
      .channel(`doc-${ref.collection}-${ref.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: ref.collection,
          filter: `id=eq.${ref.id}`,
        },
        async (payload) => {
          callback({
            exists: () => true,
            data: () => payload.new,
            id: ref.id,
          });
        }
      )
      .subscribe();
    
    // Also fetch initial data
    getDoc(ref).then(callback).catch(errorCallback);
    
    return () => supabase.removeChannel(channel);
  }
  
  // For collection snapshots (including subcollections)
  const channel = supabase
    .channel(`collection-${ref.collection}-${ref.parentId || 'all'}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: ref.collection,
      },
      async () => {
        // Refetch all docs
        const snapshot = await getDocs(ref);
        callback(snapshot);
      }
    )
    .subscribe();
  
  // Fetch initial data
  getDocs(ref).then(callback).catch(errorCallback);
  
  return () => supabase.removeChannel(channel);
}

// ============ Transaction Support ============

export async function runTransaction(
  _db: any,
  updateFunction: (transaction: any) => Promise<any>
) {
  // Simplified transaction - retries on conflict
  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const transaction = {
        get: async (ref: { collection: string; id?: string }) => {
          return getDoc(ref);
        },
        set: async (ref: { collection: string; id?: string }, data: any, options?: any) => {
          return setDoc(ref, data, options);
        },
        update: async (ref: { collection: string; id?: string }, data: any) => {
          const processedData = await applySpecialMarkers(ref.collection, ref.id!, data);
          const { error } = await supabase
            .from(ref.collection)
            .update(processedData)
            .eq('id', ref.id);
          if (error) throw error;
        },
        delete: async (ref: { collection: string; id?: string }) => {
          return deleteDoc(ref);
        },
      };

      const result = await updateFunction(transaction);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

// ============ Auth Compatibility ============

export const auth = {
  currentUser: null,
  
  async updateProfile(profile: { displayName?: string; photoURL?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    await supabase.auth.updateUser({
      data: {
        full_name: profile.displayName,
        avatar_url: profile.photoURL,
      },
    });
  },
};

// Re-export supabase for direct usage
export { supabase as db };
export { supabase };
