'use client';

import { useUser } from '@/firebase';
import { SimpleLogin } from './simple-login';
import { MainLayout } from './main-layout';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <SimpleLogin title="TimeTrack Pro" description="Please sign in to continue" />;
  }

  return <MainLayout>{children}</MainLayout>;
}
