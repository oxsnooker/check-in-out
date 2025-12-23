'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo } from 'react';

// --- Placeholder Hooks and Providers ---
// These are simplified versions to avoid breaking the component imports.
// They do not provide any real functionality.

export const useFirebase = () => { throw new Error('Firebase not implemented') };
export const useAuth = () => { throw new Error('Firebase not implemented') };
export const useFirestore = () => { throw new Error('Firebase not implemented') };
export const useFirebaseApp = () => { throw new Error('Firebase not implemented') };
export const useUser = () => ({ user: null, isLoading: false });

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps);
}

// Placeholder provider
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
