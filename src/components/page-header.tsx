'use client';

import { SidebarTrigger } from './ui/sidebar';
import { UserNav } from './user-nav';
import { useUser } from '@/firebase';


type PageHeaderProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const { user } = useUser();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl font-headline">
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
         {children}
         {user && <UserNav user={user} className="hidden md:flex" />}
      </div>
    </div>
  );
}
