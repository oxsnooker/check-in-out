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
  KeyRound,
} from 'lucide-react';
import { calculateWorkingHours, toDate } from '@/lib/utils';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';


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
  const { toast } = useToast();
  
  const staffCollRef = useMemoFirebase(
    () => collection(firestore, 'staff'),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollRef);

  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [passwordInput, setPasswordInput] = React.useState('');
  const [isVerified, setIsVerified] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState<number | null>(null);
  const [selectedYear, setSelectedYear] = React.useState<number | null>(null);

  React.useEffect(() => {
    const currentDate = new Date();
    setSelectedMonth(currentDate.getMonth());
    setSelectedYear(currentDate.getFullYear());
  }, []);

  const monthStartDate = selectedYear !== null && selectedMonth !== null ? startOfMonth(new Date(selectedYear, selectedMonth)) : new Date();
  const monthEndDate = selectedYear !== null && selectedMonth !== null ? endOfMonth(new Date(selectedYear, selectedMonth)) : new Date();

  const attendanceQuery = useMemoFirebase(() => {
    if (!selectedStaffId || !isVerified || selectedMonth === null || selectedYear === null) return null;
    return query(
      collection(firestore, `staff/${selectedStaffId}/attendanceRecords`),
      where('date', '>=', startOfMonth(new Date(selectedYear, selectedMonth))),
      where('date', '<=', endOfMonth(new Date(selectedYear, selectedMonth)))
    );
  }, [firestore, selectedStaffId, isVerified, selectedMonth, selectedYear]);
  const { data: allAttendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  
  const advancesQuery = useMemoFirebase(() => {
    if (!selectedStaffId || !isVerified || selectedMonth === null || selectedYear === null) return null;
    return query(
      collection(firestore, `staff/${selectedStaffId}/advancePayments`),
      where('date', '>=', startOfMonth(new Date(selectedYear, selectedMonth))),
      where('date', '<=', endOfMonth(new Date(selectedYear, selectedMonth)))
    );
  }, [firestore, selectedStaffId, isVerified, selectedMonth, selectedYear]);
  const { data: allAdvances, isLoading: isLoadingAdvances } = useCollection<AdvancePayment>(advancesQuery);
  
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleStaffSelection = (staffId: string) => {
    setSelectedStaffId(staffId);
    setIsVerified(false);
    setPasswordInput('');
  };

  const handleVerification = () => {
    const staffMember = staff?.find(s => s.id === selectedStaffId);
    if (staffMember && staffMember.password === passwordInput) {
      setIsVerified(true);
      toast({
        title: 'Success',
        description: 'Password verified. Loading salary details.'
      });
    } else {
      toast({
        title: 'Error',
        description: 'Incorrect password. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const selectedStaffInfo = staff?.find((s) => s.id === selectedStaffId);

  let salaryData: SalaryData | null = null;
  
  if (selectedStaffId && isVerified && selectedStaffInfo && allAttendance && allAdvances) {
    const totalHours = allAttendance.reduce((acc, record) => {
        if (record.isAbsent) return acc;
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
  
  const isLoadingData = (isLoadingAttendance || isLoadingAdvances) && isVerified;

  if (selectedMonth === null || selectedYear === null) {
      return (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
              <Hourglass className="size-12 animate-spin text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold text-muted-foreground">
                Initializing...
              </h3>
          </div>
      );
  }

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
          <div className="flex items-center gap-2">
            <Select
                onValueChange={(value) => setSelectedMonth(Number(value))}
                value={String(selectedMonth)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) => setSelectedYear(Number(value))}
                value={String(selectedYear)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            <Select
              onValueChange={handleStaffSelection}
              value={selectedStaffId ?? ''}
              disabled={isLoadingStaff}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={isLoadingStaff ? "Loading staff..." : "Select staff"} />
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

      {selectedStaffId && !isVerified && (
        <Card className="mx-auto max-w-sm">
          <CardHeader>
            <CardTitle>Password Required</CardTitle>
            <CardDescription>Enter the password for {selectedStaffInfo?.firstName} to view salary details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                id="staff-password"
                type="password"
                placeholder="Staff Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerification()}
              />
            </div>
             <Button onClick={handleVerification} className="w-full">
              <KeyRound className="mr-2 size-4" />
              Verify & View
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoadingData && (
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

      {salaryData && !isLoadingData && isVerified && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card key={salaryData.staffId} className="flex flex-col">
            <CardHeader>
              <CardTitle>{salaryData.staffName}</CardTitle>
               <CardDescription>
                  Salary for {format(monthStartDate, 'MMMM yyyy')}
                </CardDescription>
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
                  {salaryData.hourlyRate.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="size-4" />
                  Gross Salary
                </span>
                <span className="font-medium text-green-600">
                  {salaryData.salaryAmount.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="size-4" />
                  Total Advance
                </span>
                <span className="font-medium text-red-600">
                  {salaryData.totalAdvance.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-semibold">Balance Payable</span>
                <span className="text-xl font-bold text-primary">
                  {salaryData.balance.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
