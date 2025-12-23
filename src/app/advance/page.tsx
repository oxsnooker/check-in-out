import AdvancePage from '@/components/pages/advance-page';
import { PageHeader } from '@/components/page-header';

export default function Advances() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Advance Payments"
        description="Record and track advance payments made to staff."
      />
      <AdvancePage />
    </div>
  );
}
