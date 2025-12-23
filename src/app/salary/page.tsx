import { getStaff, getAttendanceRecords, getAdvancePayments } from '@/lib/data';
import { calculateWorkingHours } from '@/lib/utils';
import SalaryPage from '@/components/pages/salary-page';
import { PageHeader } from '@/components/page-header';

export default async function Salary() {
  const staff = await getStaff();
  const attendance = await getAttendanceRecords();
  const advances = await getAdvancePayments();

  const salaryData = staff.map(s => {
    const staffAttendance = attendance.filter(a => a.staffId === s.id);
    const staffAdvances = advances.filter(a => a.staffId === s.id);

    const totalHours = staffAttendance.reduce((acc, record) => {
      return acc + calculateWorkingHours(record.checkIn, record.checkOut);
    }, 0);

    const totalAdvance = staffAdvances.reduce((acc, payment) => acc + payment.amount, 0);

    const salaryAmount = totalHours * s.hourlyRate;
    const balance = salaryAmount - totalAdvance;

    return {
      staffId: s.id,
      staffName: s.name,
      totalHours,
      hourlyRate: s.hourlyRate,
      salaryAmount,
      totalAdvance,
      balance,
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Salary Overview"
        description="View calculated salary details for each staff member."
      />
      <SalaryPage salaryData={salaryData} staff={staff} />
    </div>
  );
}
