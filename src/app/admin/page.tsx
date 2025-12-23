import AdminPage from '@/components/pages/admin-page';
import { PageHeader } from '@/components/page-header';

export default function Admin() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Admin Panel"
        description="Add, remove, and manage your staff members."
      />
      <AdminPage />
    </div>
  );
}
