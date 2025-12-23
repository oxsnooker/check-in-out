import { getAdvancePayments, getStaff } from '@/lib/data';
import AdvancePage from '@/components/pages/advance-page';
import { PageHeader } from '@/components/page-header';

export default async function Advances() {
  const staff = await getStaff();
  const advancePayments = await getAdvancePayments();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Advance Payments"
        description="Record and track advance payments made to staff."
      />
      <AdvancePage staff={staff} initialPayments={advancePayments} />
    </div>
  );
}
