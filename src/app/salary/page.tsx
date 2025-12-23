import SalaryPage from '@/components/pages/salary-page';
import { PageHeader } from '@/components/page-header';

export default function Salary() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Salary Overview"
        description="View calculated salary details for each staff member."
      />
      <SalaryPage />
    </div>
  );
}
