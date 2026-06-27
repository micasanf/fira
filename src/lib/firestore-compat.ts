/**
 * Firestore-to-Supabase Compatibility Layer
 * 
 * This provides Firestore-like APIs backed by Supabase.
 * Allows gradual migration — existing Firestore-style code works
 * while we rewrite to native Supabase queries.
 */

import { supabase } from './supabase';

// ============ Query Builders ============

export function doc(_db: any, collection: string, id?: string) {
  return { collection, id };
}

export function collection(_db: any, name: string) {
  return { collection: name };
}

// ============ Get Operations ============

export async function getDoc(ref: { collection: string; id?: string }) {
  if (!ref.id) throw new Error('Document ID required');
  const { data, error } = await supabase
    .from(ref.collection)
    .select('*')
    .eq('uid', ref.id)
    .single();
  
  return {
    exists: !!data,
    data: () => data,
    id: ref.id,
  };
}

export async function getDocs(queryRef: any) {
  // queryRef can be a collection ref or a query
  let query = supabase.from(queryRef.collection || queryRef.table).select('*');
  
  // Apply filters if any
  if (queryRef.filters) {
    for (const f of queryRef.filters) {
      if (f.op === '==') query = query.eq(f.field, f.value);
      else if (f.op === '!=') query = query.neq(f.field, f.value);
      else if (f.op === '>') query = query.gt(f.field, f.value);
      else if (f.op === '<') query = query.lt(f.field, f.value);
      else if (f.op === '>=') query = query.gte(f.field, f.value);
      else if (f.op === '<=') query = query.lte(f.field, f.value);
      else if (f.op === 'in') query = query.in(f.field, f.value);
      else if (f.op === 'array-contains') query = query.contains(f.field, [f.value]);
    }
  }
  
  // Apply ordering
  if (queryRef.orders) {
    for (const o of queryRef.orders) {
      query = query.order(o.field, { ascending: o.ascending });
    }
  }
  
  // Apply limit
  if (queryRef.limitCount) {
    query = query.limit(queryRef.limitCount);
  }
  
  const { data, error } = await query;
  
  return {
    docs: (data || []).map((doc: any) => ({
      id: doc.id || doc.uid,
      data: () => doc,
      exists: true,
    })),
    empty: !data || data.length === 0,
    size: data?.length || 0,
  };
}

// ============ Write Operations ============

export async function setDoc(
  ref: { collection: string; id?: string },
  data: any,
  options?: { merge?: boolean }
) {
  if (!ref.id) throw new Error('Document ID required');
  
  const record = { uid: ref.id, ...data };
  
  if (options?.merge) {
    const { error } = await supabase
      .from(ref.collection)
      .upsert(record, { onConflict: 'uid' });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from(ref.collection)
      .upsert(record, { onConflict: 'uid' });
    if (error) throw error;
  }
  
  return { id: ref.id };
}

export async function addDoc(
  ref: { collection: string },
  data: any
) {
  const { data: result, error } = await supabase
    .from(ref.collection)
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return { id: result?.id };
}

export async function updateDoc(
  ref: { collection: string; id?: string },
  data: any
) {
  if (!ref.id) throw new Error('Document ID required');
  
  const { error } = await supabase
    .from(ref.collection)
    .update(data)
    .eq('uid', ref.id);
  
  if (error) throw error;
}

export async function deleteDoc(
  ref: { collection: string; id?: string }
) {
  if (!ref.id) throw new Error('Document ID required');
  
  const { error } = await supabase
    .from(ref.collection)
    .delete()
    .eq('uid', ref.id);
  
  if (error) throw error;
}

// ============ Query Builder ============

export function query(ref: any, ...constraints: any[]) {
  let result = { ...ref, filters: [], orders: [] };
  
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
};

// ============ Realtime ============

export function onSnapshot(
  ref: any,
  callback: (snapshot: any) => void,
  errorCallback?: (error: any) => void
) {
  // For document snapshots
  if (ref.id) {
    const channel = supabase
      .channel(`doc-${ref.collection}-${ref.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: ref.collection,
          filter: `uid=eq.${ref.id}`,
        },
        async (payload) => {
          callback({
            exists: true,
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
  
  // For collection snapshots
  const channel = supabase
    .channel(`collection-${ref.collection || ref.table}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: ref.collection || ref.table,
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
