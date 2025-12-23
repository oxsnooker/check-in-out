import { getAttendanceRecords, getStaff } from '@/lib/data';
import AttendancePage from '@/components/pages/attendance-page';
import { PageHeader } from '@/components/page-header';

export default async function Home() {
  const staff = await getStaff();
  const attendanceRecords = await getAttendanceRecords();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Attendance"
        description="Log daily check-in and check-out times for your staff."
      />
      <AttendancePage staff={staff} initialRecords={attendanceRecords} />
    </div>
  );
}
