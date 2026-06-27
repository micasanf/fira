// Firebase Admin compatibility layer — redirects to Supabase Admin
// This allows existing server-side code to gradually migrate
// 
// Includes camelCase → snake_case field mapping and collection name mapping
// to match the PostgreSQL schema.

import { createSupabaseAdminClient } from './supabase-server';

const adminClient = createSupabaseAdminClient();

// Re-export FieldValue from firestore-compat for server-side usage
export { FieldValue, increment, Timestamp } from './firestore-compat';

// ============ Collection Name Mapping ============

const COLLECTION_TO_TABLE: Record<string, string> = {
  users: 'users',
  publicProfiles: 'public_profiles',
  opportunities: 'opportunities',
  applications: 'applications',
  posts: 'posts',
  postComments: 'post_comments',
  chatMessages: 'chat_messages',
  chat_messages: 'chat_messages',
  notifications: 'notifications',
  calls: 'calls',
  savedJobDescriptions: 'saved_job_descriptions',
  savedOpportunities: 'saved_opportunities',
  followers: 'followers',
};

function resolveTableName(collection: string): string {
  return COLLECTION_TO_TABLE[collection] || collection;
}

// ============ Field Name Mapping ============

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

const FIELD_ALIASES: Record<string, Record<string, string>> = {
  users: {
    displayName: 'display_name',
    firstName: 'first_name',
    lastName: 'last_name',
    photoURL: 'photo_url',
    companyName: 'company_name',
    stripeCustomerId: 'stripe_customer_id',
    subscriptionId: 'stripe_subscription_id',
    subscriptionStatus: 'subscription_status',
    planUpdatedAt: 'plan_updated_at',
    lastWebhookEventId: 'last_webhook_event_id',
    customerId: 'stripe_customer_id',
    encryptionPublicKey: 'encryption_public_key',
  },
  applications: {
    userId: 'user_id',
    opportunityId: 'opportunity_id',
    employerId: 'employer_id',
    submittedAt: 'submitted_at',
    updatedAt: 'updated_at',
    userEmail: 'user_email',
    userName: 'user_name',
    coverLetter: 'cover_letter',
    resumeUrl: 'resume_url',
    appliedAt: 'applied_at',
  },
  opportunities: {
    employerId: 'employer_id',
    employerName: 'employer_name',
    employerPhotoURL: 'employer_photo_url',
    applicationCount: 'application_count',
    applicants: 'application_count',
    companyLogo: 'company_logo',
    experienceLevel: 'experience_level',
    jobType: 'job_type',
    isRemote: 'is_remote',
    isFeatured: 'is_featured',
    postedAt: 'posted_at',
  },
  notifications: {
    userId: 'user_id',
    actorId: 'actor_id',
    actorName: 'actor_name',
    actorPhotoUrl: 'actor_photo_url',
    isRead: 'is_read',
    read: 'is_read',
  },
  saved_job_descriptions: {
    userId: 'user_id',
    fileName: 'file_name',
  },
};

function mapFieldToColumn(collection: string, field: string): string {
  const table = resolveTableName(collection);
  const aliases = FIELD_ALIASES[table] || FIELD_ALIASES[collection] || {};
  if (aliases[field]) return aliases[field];
  if (field.includes('_')) return field;
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
    result[key] = value;
    const camelKey = snakeToCamel(key);
    if (camelKey !== key) {
      result[camelKey] = value;
    }
  }
  return result;
}

// ============ Admin DB ============

export const adminDb = {
  // Firestore compatibility: collection()
  collection(name: string) {
    const table = resolveTableName(name);
    return {
      // Firestore compat: .where().get()
      where(field: string, op: string, value: any) {
        const col = mapFieldToColumn(name, field);
        return {
          async get() {
            let q = adminClient.from(table).select('*');
            if (op === '==') q = q.eq(col, value);
            else if (op === '!=') q = q.neq(col, value);
            else if (op === '>') q = q.gt(col, value);
            else if (op === '<') q = q.lt(col, value);
            else if (op === '>=') q = q.gte(col, value);
            else if (op === '<=') q = q.lte(col, value);
            else if (op === 'array-contains') q = q.contains(col, [value]);
            
            const { data, error } = await q;
            return {
              docs: (data || []).map((doc: any) => {
                const mapped = mapRecordFromColumns(doc);
                return {
                  id: doc.id,
                  data: () => mapped,
                  exists: true,
                  get: (f: string) => mapped[f] ?? mapped[mapFieldToColumn(name, f)],
                };
              }),
              empty: !data || data.length === 0,
            };
          },
          // Chain more where clauses
          where(field2: string, op2: string, value2: any) {
            const col2 = mapFieldToColumn(name, field2);
            return {
              async get() {
                let q = adminClient.from(table).select('*');
                if (op === '==') q = q.eq(col, value);
                else if (op === '!=') q = q.neq(col, value);
                if (op2 === '==') q = q.eq(col2, value2);
                else if (op2 === '!=') q = q.neq(col2, value2);
                
                const { data, error } = await q;
                return {
                  docs: (data || []).map((doc: any) => {
                    const mapped = mapRecordFromColumns(doc);
                    return {
                      id: doc.id,
                      data: () => mapped,
                      exists: true,
                      get: (f: string) => mapped[f] ?? mapped[mapFieldToColumn(name, f)],
                    };
                  }),
                  empty: !data || data.length === 0,
                };
              },
            };
          },
        };
      },
      async get() {
        const { data, error } = await adminClient.from(table).select('*');
        return {
          docs: (data || []).map((doc: any) => {
            const mapped = mapRecordFromColumns(doc);
            return {
              id: doc.id,
              data: () => mapped,
              exists: true,
              get: (f: string) => mapped[f] ?? mapped[mapFieldToColumn(name, f)],
            };
          }),
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
      collection = pathOrId;
      id = parts[0];
    } else {
      const pathParts = pathOrId.split('/');
      id = pathParts[pathParts.length - 1];
      collection = pathParts[pathParts.length - 2];
    }

    const table = resolveTableName(collection);

    const docRef = {
      collection,
      id,
      async get() {
        const { data, error } = await adminClient
          .from(table)
          .select('*')
          .eq('id', id)
          .single();
        const mapped = data ? mapRecordFromColumns(data) : null;
        return {
          exists: !!data,
          data: () => mapped,
          id,
          get: (field: string) => mapped?.[field] ?? mapped?.[mapFieldToColumn(collection, field)],
        };
      },
      async set(data: any, options?: any) {
        const mappedData = mapRecordToColumns(collection, data);
        const record = { id, ...mappedData };
        const { error } = await adminClient
          .from(table)
          .upsert(record, { onConflict: 'id' });
        if (error) throw error;
        return { id };
      },
      async update(data: any) {
        const mappedData = mapRecordToColumns(collection, data);
        const { error } = await adminClient
          .from(table)
          .update(mappedData)
          .eq('id', id);
        if (error) throw error;
        return { id };
      },
      async delete() {
        const { error } = await adminClient
          .from(table)
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
