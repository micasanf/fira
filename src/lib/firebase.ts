// Firebase compatibility layer — redirects to Supabase via firestore-compat
// Existing code that imports { db, auth, doc, getDoc, etc. } from '@/lib/firebase'
// will work through the compatibility layer

export {
  supabase,
  db,
  auth,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  FieldValue,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction,
} from './firestore-compat';

export const app = null;
export const storage = null;
