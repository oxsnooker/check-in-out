'use client';

import { useContext } from 'react';
import {
  FirebaseContext,
  UserHookResult,
} from '@/firebase/provider';

/**
 * Hook to access the current user's authentication state.
 * Throws an error if used outside a FirebaseProvider.
 */
export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }

  return context.userAuthState;
};
