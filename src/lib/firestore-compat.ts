/**
 * Firestore-to-Supabase Compatibility Layer
 * 
 * This provides Firestore-like APIs backed by Supabase.
 * Allows gradual migration — existing Firestore-style code works
 * while we rewrite to native Supabase queries.
 * 
 * All tables use `id` as the primary key column.
 * The `users` table's `id` is the Supabase Auth UID.
 * 
 * Key features:
 * - Auto-converts camelCase field names → snake_case for PostgreSQL columns
 * - Maps Firebase collection names → PostgreSQL table names
 * - Handles subcollection patterns (e.g., users/{uid}/savedJobDescriptions)
 */

import { supabase } from './supabase';

// ============ Collection Name Mapping ============
// Firebase uses camelCase collection names; PostgreSQL uses snake_case table names

const COLLECTION_TO_TABLE: Record<string, string> = {
  users: 'users',
  publicProfiles: 'public_profiles',
  opportunities: 'opportunities',
  applications: 'applications',
  posts: 'posts',
  postComments: 'post_comments',
  chats: 'chats',
  chatMessages: 'chat_messages',
  chat_messages: 'chat_messages',
  notifications: 'notifications',
  calls: 'calls',
  callerIceCandidates: 'caller_ice_candidates',
  calleeIceCandidates: 'callee_ice_candidates',
  savedJobDescriptions: 'saved_job_descriptions',
  savedOpportunities: 'saved_opportunities',
  followers: 'followers',
  rateLimits: 'rate_limits',
  userEncryptionKeys: 'user_encryption_keys',
  dailyEmailCounts: 'daily_email_counts',
  monthlyEmailCounts: 'monthly_email_counts',
};

function resolveTableName(collection: string): string {
  return COLLECTION_TO_TABLE[collection] || collection;
}

// ============ Field Name Mapping ============
// Convert camelCase → snake_case for PostgreSQL column compatibility

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Known field aliases: Firebase field name → PostgreSQL column name
// Use this for fields that don't follow simple camelCase → snake_case conversion
const FIELD_ALIASES: Record<string, Record<string, string>> = {
  applications: {
    userId: 'user_id',
    opportunityId: 'opportunity_id',
    employerId: 'employer_id',
    submittedAt: 'submitted_at',
    updatedAt: 'updated_at',
    userEmail: 'user_email',
    userName: 'user_name',
    withdrawnAt: 'withdrawn_at',
    columnName: 'column_name',
    isManual: 'is_manual',
    jobUrl: 'job_url',
    resumeUrl: 'resume_url',
    coverLetter: 'cover_letter',
    appliedAt: 'applied_at',
  },
  opportunities: {
    employerId: 'employer_id',
    employerName: 'employer_name',
    employerPhotoURL: 'employer_photo_url',
    companyLogo: 'company_logo',
    companyOverview: 'company_overview',
    experienceLevel: 'experience_level',
    salaryMin: 'salary_min',
    salaryMax: 'salary_max',
    salaryCurrency: 'salary_currency',
    jobType: 'job_type',
    isRemote: 'is_remote',
    isFeatured: 'is_featured',
    is_active: 'is_active',
    applicationCount: 'application_count',
    applicationsCount: 'application_count',
    applicants: 'application_count',
    viewsCount: 'views_count',
    postedAt: 'posted_at',
    updatedAt: 'updated_at',
    expiresAt: 'expires_at',
    createdAt: 'created_at',
    preferredQualifications: 'preferred_qualifications',
    rolesAndResponsibilities: 'roles_and_responsibilities',
    compensationAndBenefits: 'compensation_and_benefities',
    workingHours: 'working_hours',
    travelRequirements: 'travel_requirements',
    applicationInstructions: 'application_instructions',
    legalStatement: 'legal_statement',
  },
  users: {
    displayName: 'display_name',
    firstName: 'first_name',
    lastName: 'last_name',
    photoURL: 'photo_url',
    coverPhoto: 'cover_photo',
    companyName: 'company_name',
    companyWebsite: 'company_website',
    companyDescription: 'company_description',
    companyLogoUrl: 'company_logo_url',
    companyIndustry: 'company_industry',
    companySize: 'company_size',
    stripeCustomerId: 'stripe_customer_id',
    stripeSubscriptionId: 'stripe_subscription_id',
    subscriptionStatus: 'subscription_status',
    planUpdatedAt: 'plan_updated_at',
    lastWebhookEventId: 'last_webhook_event_id',
    resumeUrl: 'resume_url',
    coverLetterUrl: 'cover_letter_url',
    portfolioLink: 'portfolio_link',
    linkedinLink: 'linkedin',
    linkedinUrl: 'linkedin',
    githubLink: 'github',
    githubUrl: 'github',
    websiteLink: 'website',
    websiteUrl: 'website',
    employmentHistory: 'employment_history',
    careerGoals: 'career_goals',
    encryptionPublicKey: 'encryption_public_key',
    firstLoginAt: 'first_login_at',
    lastLoginAt: 'last_login_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  public_profiles: {
    displayName: 'display_name',
    firstName: 'first_name',
    lastName: 'last_name',
    photoURL: 'photo_url',
    coverPhoto: 'cover_photo',
    companyName: 'company_name',
    companyOverview: 'company_overview',
    companyLogoUrl: 'company_logo_url',
    companySize: 'company_size',
    supportEmail: 'support_email',
    contactNumber: 'contact_number',
    portfolioLink: 'portfolio_link',
    portfolioProjects: 'portfolio_projects',
    linkedinLink: 'linkedin',
    linkedinUrl: 'linkedin',
    githubLink: 'github',
    githubUrl: 'github',
    twitterLink: 'twitter',
    twitterUrl: 'twitter',
    websiteLink: 'website',
    websiteUrl: 'website',
    employmentHistory: 'employment_history',
    careerGoals: 'career_goals',
    encryptionPublicKey: 'encryption_public_key',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  notifications: {
    userId: 'user_id',
    actorId: 'actor_id',
    actorName: 'actor_name',
    actorPhotoUrl: 'actor_photo_url',
    isRead: 'is_read',
    read: 'is_read',
    createdAt: 'created_at',
  },
  chats: {
    participantDetails: 'participant_details',
    participantNames: 'participant_names',
    participantPhotos: 'participant_photos',
    lastMessage: 'last_message',
    lastMessageAt: 'last_message_at',
    lastSenderId: 'last_sender_id',
    unreadCount: 'unread_count',
    hiddenFor: 'hidden_for',
    isGroup: 'is_group',
    groupName: 'group_name',
    opportunityId: 'opportunity_id',
    opportunityTitle: 'opportunity_title',
    applicationId: 'application_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  chat_messages: {
    chatId: 'chat_id',
    senderId: 'sender_id',
    isRead: 'is_read',
    isEncrypted: 'is_encrypted',
    messageType: 'message_type',
    createdAt: 'created_at',
  },
  calls: {
    callerId: 'caller_id',
    calleeId: 'callee_id',
    callerName: 'caller_name',
    calleeName: 'callee_name',
    opportunityId: 'opportunity_id',
    opportunityTitle: 'opportunity_title',
    startedAt: 'started_at',
    endedAt: 'ended_at',
    createdAt: 'created_at',
  },
  saved_job_descriptions: {
    userId: 'user_id',
    fileName: 'file_name',
    aiEnhancedText: 'ai_enhanced_text',
    isEnhanced: 'is_enhanced',
    originalText: 'original_text',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  posts: {
    userId: 'user_id',
    userName: 'user_name',
    userPhoto: 'user_photo',
    userRole: 'user_role',
    userTitle: 'user_title',
    imageUrl: 'image_url',
    commentsCount: 'comments_count',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  post_comments: {
    postId: 'post_id',
    authorId: 'author_id',
    createdAt: 'created_at',
  },
  saved_opportunities: {
    userId: 'user_id',
    opportunityId: 'opportunity_id',
    createdAt: 'created_at',
  },
  followers: {
    followerId: 'follower_id',
    followingId: 'following_id',
    createdAt: 'created_at',
  },
  caller_ice_candidates: {
    callId: 'call_id',
    createdAt: 'created_at',
  },
  callee_ice_candidates: {
    callId: 'call_id',
    createdAt: 'created_at',
  },
};

function mapFieldToColumn(collection: string, field: string): string {
  const table = resolveTableName(collection);
  const aliases = FIELD_ALIASES[table] || FIELD_ALIASES[collection] || {};
  if (aliases[field]) return aliases[field];
  // If already snake_case, return as-is
  if (field.includes('_')) return field;
  // Fallback: convert camelCase → snake_case
  return camelToSnake(field);
}

function mapRecordToColumns(collection: string, data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const col = mapFieldToColumn(collection, key);
    result[col] = value;
  }
  return result;
}

function mapRecordFromColumns(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    // Convert snake_case back to camelCase for Firestore-style access
    result[key] = value;
    // Also provide camelCase alias
    const camelKey = snakeToCamel(key);
    if (camelKey !== key) {
      result[camelKey] = value;
    }
  }
  return result;
}

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
    return { collection: args[0], id: args[1] };
  }
  if (args.length === 4) {
    return { collection: args[2], id: args[3], parentId: args[1], parentCollection: args[0] };
  }
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
    return { collection: args[2], parentId: args[1], parentCollection: args[0] };
  }
  return { collection: args[0] };
}

// ============ Subcollection parent field resolver ============

function getParentField(parentCollection: string): string {
  // Map parent collection name → FK column name
  if (parentCollection === 'users') return 'user_id';
  return `${camelToSnake(parentCollection)}_id`;
}

// ============ Get Operations ============

export async function getDoc(ref: any) {
  if (!ref.id) throw new Error('Document ID required');
  
  const table = resolveTableName(ref.collection);
  let q = supabase.from(table).select('*').eq('id', ref.id);
  
  // Add parent filter for subcollection patterns
  if (ref.parentId && ref.parentCollection) {
    const parentField = getParentField(ref.parentCollection);
    q = q.eq(parentField, ref.parentId);
  }
  
  const { data, error } = await q.single();
  
  const mappedData = data ? mapRecordFromColumns(data) : null;
  
  return {
    exists: () => !!data,
    data: () => mappedData,
    id: ref.id,
    get: (field: string) => mappedData?.[field] ?? mappedData?.[mapFieldToColumn(ref.collection, field)],
  };
}

export async function getDocs(queryRef: any) {
  const table = resolveTableName(queryRef.collection || queryRef.table);
  let q = supabase.from(table).select('*');
  
  // Add parent filter for subcollection patterns
  if (queryRef.parentId && queryRef.parentCollection) {
    const parentField = getParentField(queryRef.parentCollection);
    q = q.eq(parentField, queryRef.parentId);
  }
  
  // Apply filters if any
  if (queryRef.filters) {
    for (const f of queryRef.filters) {
      const col = mapFieldToColumn(queryRef.collection || queryRef.table, f.field);
      if (f.op === '==') q = q.eq(col, f.value);
      else if (f.op === '!=') q = q.neq(col, f.value);
      else if (f.op === '>') q = q.gt(col, f.value);
      else if (f.op === '<') q = q.lt(col, f.value);
      else if (f.op === '>=') q = q.gte(col, f.value);
      else if (f.op === '<=') q = q.lte(col, f.value);
      else if (f.op === 'in') q = q.in(col, f.value);
      else if (f.op === 'array-contains') q = q.contains(col, [f.value]);
    }
  }
  
  // Apply ordering
  if (queryRef.orders) {
    for (const o of queryRef.orders) {
      const col = mapFieldToColumn(queryRef.collection || queryRef.table, o.field);
      q = q.order(col, { ascending: o.ascending });
    }
  }
  
  // Apply limit
  if (queryRef.limitCount) {
    q = q.limit(queryRef.limitCount);
  }
  
  const { data, error } = await q;
  
  return {
    docs: (data || []).map((doc: any) => {
      const mapped = mapRecordFromColumns(doc);
      return {
        id: doc.id,
        data: () => mapped,
        exists: true,
        get: (field: string) => mapped[field] ?? mapped[mapFieldToColumn(queryRef.collection, field)],
      };
    }),
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
  
  const table = resolveTableName(ref.collection);
  let mappedData = mapRecordToColumns(ref.collection, data);
  let record = { id: ref.id, ...mappedData };
  
  // Add parent reference for subcollection patterns
  if (ref.parentId && ref.parentCollection) {
    const parentField = getParentField(ref.parentCollection);
    record[parentField] = ref.parentId;
  }
  
  const { error } = await supabase
    .from(table)
    .upsert(record, { onConflict: 'id' });
  
  if (error) throw error;
  return { id: ref.id };
}

export async function addDoc(
  ref: any,
  data: any
) {
  const table = resolveTableName(ref.collection);
  let mappedData = mapRecordToColumns(ref.collection, data);
  let record = { ...mappedData };
  
  // Add parent reference for subcollection patterns
  if (ref.parentId && ref.parentCollection) {
    const parentField = getParentField(ref.parentCollection);
    record[parentField] = ref.parentId;
  }
  
  const { data: result, error } = await supabase
    .from(table)
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
  const table = resolveTableName(collection);
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
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    currentData = existing;
  }

  for (const [key, value] of Object.entries(data)) {
    const col = mapFieldToColumn(collection, key);
    if (value && typeof value === 'object') {
      if (value.__type === 'arrayUnion') {
        const currentArray = currentData?.[col] || [];
        processedData[col] = [...currentArray, ...value.elements];
      } else if (value.__type === 'arrayRemove') {
        const currentArray = currentData?.[col] || [];
        processedData[col] = currentArray.filter(
          (item: any) => !value.elements.some(el => JSON.stringify(el) === JSON.stringify(item))
        );
      } else if (value.__type === 'increment') {
        const currentVal = currentData?.[col] || 0;
        processedData[col] = currentVal + value.value;
      } else {
        processedData[col] = value;
      }
    } else {
      processedData[col] = value;
    }
  }

  return processedData;
}

export async function updateDoc(
  ref: any,
  data: any
) {
  if (!ref.id) throw new Error('Document ID required');
  
  const table = resolveTableName(ref.collection);
  const processedData = await applySpecialMarkers(ref.collection, ref.id, data);
  
  let q = supabase.from(table).update(processedData).eq('id', ref.id);
  
  // Add parent filter for subcollection patterns
  if (ref.parentId && ref.parentCollection) {
    const parentField = getParentField(ref.parentCollection);
    q = q.eq(parentField, ref.parentId);
  }
  
  const { error } = await q;
  if (error) throw error;
}

export async function deleteDoc(
  ref: any
) {
  if (!ref.id) throw new Error('Document ID required');
  
  const table = resolveTableName(ref.collection);
  let q = supabase.from(table).delete().eq('id', ref.id);
  
  // Add parent filter for subcollection patterns
  if (ref.parentId && ref.parentCollection) {
    const parentField = getParentField(ref.parentCollection);
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
  const table = resolveTableName(ref.collection);
  
  // For document snapshots
  if (ref.id && !ref.parentId) {
    const channel = supabase
      .channel(`doc-${table}-${ref.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `id=eq.${ref.id}`,
        },
        async (payload) => {
          const mapped = mapRecordFromColumns(payload.new);
          callback({
            exists: () => true,
            data: () => mapped,
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
    .channel(`collection-${table}-${ref.parentId || 'all'}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
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
          const table = resolveTableName(ref.collection);
          const { error } = await supabase
            .from(table)
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
