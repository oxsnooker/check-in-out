import {
  collection,
  collectionGroup,
  getDocs,
  getDoc,
  doc,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import type { Staff, AttendanceRecord, AdvancePayment } from './definitions';

function transformDoc<T>(doc: DocumentData): T & { id: string } {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    // Convert Firestore Timestamps to JS Dates
    ...Object.fromEntries(
      Object.entries(data).map(([key, value]) =>
        value instanceof Timestamp ? [key, value.toDate()] : [key, value]
      )
    ),
  } as T & { id: string };
}
// The 'initializeFirebase' call was removed from this file.
// Data fetching should now happen in client components.
