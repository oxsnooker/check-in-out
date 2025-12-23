'use client';
    
// This hook is disabled as Firestore has been removed.
// It returns a default state.

export interface UseDocResult<T> {
  data: any | null;
  isLoading: boolean;
  error: Error | null;
}

export function useDoc<T = any>(
  docRef: any,
): UseDocResult<T> {
  return { data: null, isLoading: false, error: null };
}
