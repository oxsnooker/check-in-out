import AttendancePage from '@/components/pages/attendance-page';
import { PageHeader } from '@/components/page-header';

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Attendance"
        description="Log daily check-in and check-out times for your staff."
      />
      <AttendancePage />
    </div>
  );
}
