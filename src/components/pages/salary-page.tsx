'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
  ShieldCheck,
} from 'lucide-react';
import { calculateWorkingHours, toDate } from '@/lib/utils';
import useLocalStorage from '@/hooks/use-local-storage';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection, query } from 'firebase/firestore';


interface SalaryData {
  staffId: string;
  staffName: string;
  totalHours: number;
  hourlyRate: number;
  salaryAmount: number;
  totalAdvance: number;
  balance: number;
}

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Verifying...' : 'Verify & View Salary'}
      <ShieldCheck className="ml-2 size-4" />
    </Button>
  );
}

export default function SalaryPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const staffCollRef = useMemoFirebase(
    () => collection(firestore, 'staff'),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollRef);

  const [adminPassword] = useLocalStorage<string>('adminPassword', 'Teamox76@');
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [isVerified, setIsVerified] = React.useState(false);

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
  

  function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;
    if (password === adminPassword) {
      setIsVerified(true);
    } else {
      setIsVerified(false);
      toast({
        title: 'Verification Failed',
        description: 'Incorrect password.',
        variant: 'destructive',
      });
    }
  }

  const handleStaffSelection = (staffId: string) => {
    setSelectedStaffId(staffId);
    setIsVerified(false);
  };

  const selectedStaffInfo = staff?.find((s) => s.id === selectedStaffId);

  let salaryData: SalaryData | null = null;
  
  if (selectedStaffId && selectedStaffInfo && allAttendance && allAdvances) {
    const totalHours = allAttendance.reduce((acc, record) => {
        const hours1 = calculateWorkingHours(toDate(record.checkIn), toDate(record.checkOut));
        const hours2 = calculateWorkingHours(toDate(record.checkIn2), toDate(record.checkOut2));
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
      staffName: selectedStaffInfo.name,
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
          <div className="w-[180px]">
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
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {selectedStaffId && !isVerified && (
        <Card className="mx-auto max-w-md">
          <form onSubmit={handleVerify}>
            <CardHeader>
              <CardTitle>Verify Access</CardTitle>
              <CardDescription>
                To view salary details for {selectedStaffInfo?.name}, please
                enter the admin password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <VerifyButton />
            </CardFooter>
          </form>
        </Card>
      )}

      {selectedStaffId && isVerified && isLoading && (
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

      {salaryData && isVerified && !isLoading && (
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
