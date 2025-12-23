'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  Clock,
  Wallet,
  AreaChart,
  Users,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Attendance', icon: Clock },
  { href: '/advance', label: 'Advance', icon: Wallet },
  { href: '/salary', label: 'Salary', icon: AreaChart },
  { href: '/admin', label: 'Admin', icon: Users },
];

export function NavItems() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={item.label}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
