'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  Staff,
  AttendanceRecord,
  AdvancePayment,
} from '@/lib/definitions';
import {
  DollarSign,
  Clock,
  Hourglass,
  UserSearch,
} from 'lucide-react';
import { calculateWorkingHours, toDate } from '@/lib/utils';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';


interface SalaryData {
  staffId: string;
  staffName: string;
  totalHours: number;
  hourlyRate: number;
  salaryAmount: number;
  totalAdvance: number;
  balance: number;
}

export default function SalaryPage() {
  const firestore = useFirestore();
  
  const staffCollRef = useMemoFirebase(
    () => collection(firestore, 'staff'),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollRef);

  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);

  const attendanceQuery = useMemoFirebase(() => {
    if (!selectedStaffId) return null;
    return query(collection(firestore, `staff/${selectedStaffId}/attendanceRecords`));
  }, [firestore, selectedStaffId]);
  const { data: allAttendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  
  const advancesQuery = useMemoFirebase(() => {
    if (!selectedStaffId) return null;
    return query(collection(firestore, `staff/${selectedStaffId}/advancePayments`));
  }, [firestore, selectedStaffId]);
  const { data: allAdvances, isLoading: isLoadingAdvances } = useCollection<AdvancePayment>(advancesQuery);
  

  const handleStaffSelection = (staffId: string) => {
    setSelectedStaffId(staffId);
  };

  const selectedStaffInfo = staff?.find((s) => s.id === selectedStaffId);

  let salaryData: SalaryData | null = null;
  
  if (selectedStaffId && selectedStaffInfo && allAttendance && allAdvances) {
    const totalHours = allAttendance.reduce((acc, record) => {
        const hours1 = calculateWorkingHours(toDate(record.timeIn), toDate(record.timeOut));
        const hours2 = calculateWorkingHours(toDate(record.timeIn2), toDate(record.timeOut2));
        return acc + hours1 + hours2;
    }, 0);

    const totalAdvance = allAdvances.reduce(
      (acc, payment) => acc + payment.amount,
      0
    );

    const salaryAmount = totalHours * selectedStaffInfo.hourlyRate;
    const balance = salaryAmount - totalAdvance;

    salaryData = {
      staffId: selectedStaffId,
      staffName: `${selectedStaffInfo.firstName} ${selectedStaffInfo.lastName}`,
      totalHours,
      hourlyRate: selectedStaffInfo.hourlyRate,
      salaryAmount,
      totalAdvance,
      balance,
    };
  }
  
  const isLoading = isLoadingStaff || isLoadingAttendance || isLoadingAdvances;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle>Salary Details</CardTitle>
            <CardDescription>
              Select a staff member to view their salary information.
            </CardDescription>
          </div>
          <div className="w-[220px]">
            <Select
              onValueChange={handleStaffSelection}
              value={selectedStaffId ?? ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staff &&
                  staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {selectedStaffId && isLoading && (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
          <Hourglass className="size-12 animate-spin text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold text-muted-foreground">
            Calculating Salary...
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Please wait while we fetch the latest records.
          </p>
        </div>
      )}

      {salaryData && !isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card key={salaryData.staffId} className="flex flex-col">
            <CardHeader>
              <CardTitle>{salaryData.staffName}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Hourglass className="size-4" />
                  Total Hours
                </span>
                <span className="font-medium">
                  {salaryData.totalHours.toFixed(2)} hrs
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  Hourly Rate
                </span>
                <span className="font-medium">
                  {salaryData.hourlyRate.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="size-4" />
                  Gross Salary
                </span>
                <span className="font-medium text-green-600">
                  {salaryData.salaryAmount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="size-4" />
                  Total Advance
                </span>
                <span className="font-medium text-red-600">
                  {salaryData.totalAdvance.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-semibold">Balance Payable</span>
                <span className="text-xl font-bold text-primary">
                  {salaryData.balance.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {!selectedStaffId && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
          <UserSearch className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold text-muted-foreground">
            No Staff Selected
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Please select a staff member from the dropdown to view their salary
            details.
          </p>
        </div>
      )}
    </div>
  );
}
