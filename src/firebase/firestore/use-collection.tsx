'use client';

// This hook is disabled as Firestore has been removed.
// It returns a default state.

export interface UseCollectionResult<T> {
  data: any[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useCollection<T = any>(
    query: any,
): UseCollectionResult<T> {
  return { data: [], isLoading: false, error: null };
}
