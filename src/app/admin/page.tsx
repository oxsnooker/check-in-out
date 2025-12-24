'use client';
import { PageHeader } from '@/components/page-header';
import dynamic from 'next/dynamic';

const AdminPageClient = dynamic(
  () => import('@/components/pages/admin-page-client'),
  { ssr: false }
);

export default function Admin() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Admin Panel"
        description="Add, remove, and manage your staff members."
      />
      <AdminPageClient />
    </div>
  );
}
