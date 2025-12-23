import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NavItems } from './nav-items';
import { TimerIcon } from 'lucide-react';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TimerIcon className="size-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
                TimeTrack Pro
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <NavItems />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
