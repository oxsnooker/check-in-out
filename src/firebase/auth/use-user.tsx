'use client';

// This hook is disabled as authentication has been removed.
// It returns a default unauthenticated state.

export const useUser = () => {
  return { user: null, isLoading: false };
};
