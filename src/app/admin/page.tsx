import { getStaff } from '@/lib/data';
import AdminPage from '@/components/pages/admin-page';
import { PageHeader } from '@/components/page-header';

export default async function Admin() {
  const staff = await getStaff();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Admin Panel"
        description="Add, remove, and manage your staff members."
      />
      <AdminPage staff={staff} />
    </div>
  );
}
