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
  CircleSlash,
  UserSearch,
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import {
  collection,
  query,
  where,
  collectionGroup,
  doc,
  getDoc,
} from 'firebase/firestore';
import { calculateWorkingHours } from '@/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

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
  const { user } = useUser();
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(
    null
  );
  const [verifiedStaffId, setVerifiedStaffId] = React.useState<string | null>(
    null
  );
  const [password, setPassword] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const { toast } = useToast();

  const staffCollection = useMemoFirebase(() => {
    return collection(firestore, 'staff');
  }, [firestore]);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(
    staffCollection
  );

  const attendanceCollectionGroup = useMemoFirebase(() => {
    if (!verifiedStaffId) return null;
    return query(
      collectionGroup(firestore, 'attendance_records'),
      where('staffId', '==', verifiedStaffId)
    );
  }, [firestore, verifiedStaffId]);
  const { data: attendance, isLoading: isLoadingAttendance } =
    useCollection<AttendanceRecord>(attendanceCollectionGroup);

  const advancePaymentsCollectionGroup = useMemoFirebase(() => {
    if (!verifiedStaffId) return null;
    return query(
      collectionGroup(firestore, 'advance_payments'),
      where('staffId', '==', verifiedStaffId)
    );
  }, [firestore, verifiedStaffId]);
  const { data: advances, isLoading: isLoadingAdvances } =
    useCollection<AdvancePayment>(advancePaymentsCollectionGroup);

  const handleStaffSelection = (staffId: string) => {
    setSelectedStaffId(staffId);
    setVerifiedStaffId(null); // Reset verification on new selection
    if (staffId) {
      setDialogOpen(true);
    }
  };

  const handlePasswordVerification = async () => {
    if (!user || !user.email || !selectedStaffId || !password) {
      toast({
        title: 'Error',
        description: 'Missing information for verification.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Re-authenticate the *currently logged-in user* with their own password
      // to authorize viewing sensitive data.
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      setVerifiedStaffId(selectedStaffId);
      toast({
        title: 'Success',
        description: 'Verification successful. Showing salary data.',
      });
      setDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Verification Failed',
        description:
          'Incorrect password or another error occurred. Please try again.',
        variant: 'destructive',
      });
      setVerifiedStaffId(null);
    } finally {
      setIsVerifying(false);
      setPassword('');
    }
  };

  const selectedStaffInfo = staff?.find((s) => s.id === verifiedStaffId);

  let salaryData: SalaryData | null = null;

  if (selectedStaffInfo && attendance && advances) {
    const totalHours = attendance.reduce((acc, record) => {
      const hours1 =
        record.checkIn && record.checkOut
          ? calculateWorkingHours(record.checkIn, record.checkOut)
          : 0;
      const hours2 =
        record.checkIn2 && record.checkOut2
          ? calculateWorkingHours(record.checkIn2, record.checkOut2)
          : 0;
      return acc + hours1 + hours2;
    }, 0);

    const totalAdvance = advances.reduce(
      (acc, payment) => acc + payment.amount,
      0
    );

    const salaryAmount = totalHours * selectedStaffInfo.hourlyRate;
    const balance = salaryAmount - totalAdvance;

    salaryData = {
      staffId: verifiedStaffId!,
      staffName: selectedStaffInfo.name,
      totalHours,
      hourlyRate: selectedStaffInfo.hourlyRate,
      salaryAmount,
      totalAdvance,
      balance,
    };
  }

  const isLoadingData =
    isLoadingAttendance || isLoadingAdvances;

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
              disabled={isLoadingStaff}
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
      
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Verification Required</DialogTitle>
            <DialogDescription>
              To view the salary details for{' '}
              {staff?.find((s) => s.id === selectedStaffId)?.name}, please enter
              your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handlePasswordVerification} disabled={isVerifying}>
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoadingData ? (
        verifiedStaffId && <p>Loading salary data...</p>
      ) : salaryData ? (
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
      ) : (
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
