'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Staff, AttendanceRecord, AdvancePayment } from '@/lib/definitions';
import { DollarSign, Clock, Hourglass, CircleSlash, KeyRound } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, collectionGroup, query, where } from 'firebase/firestore';
import { calculateWorkingHours } from '@/lib/utils';
import { SimpleLogin } from '@/components/simple-login';
import { verifyStaffPassword, type State } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

interface SalaryData {
  staffId: string;
  staffName: string;
  totalHours: number;
  hourlyRate: number;
  salaryAmount: number;
  totalAdvance: number;
  balance: number;
}

function VerifyPasswordButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Verifying...' : 'Verify Password'}
        </Button>
    )
}

export default function SalaryPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [verifiedStaffId, setVerifiedStaffId] = React.useState<string | null>(null);
  const [isDialogOpen, setDialogOpen] = React.useState(false);

  const staffCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'staff')
  }, [firestore, user]);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollection);
  
  const attendanceCollectionGroup = useMemoFirebase(() => {
    if (!user || !verifiedStaffId) return null;
    return query(collectionGroup(firestore, 'attendance_records'), where('staffId', '==', verifiedStaffId));
  }, [firestore, user, verifiedStaffId]);
  const { data: attendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceCollectionGroup);
  
  const advancePaymentsCollectionGroup = useMemoFirebase(() => {
    if (!user || !verifiedStaffId) return null;
    return query(collectionGroup(firestore, 'advance_payments'), where('staffId', '==', verifiedStaffId));
  }, [firestore, user, verifiedStaffId]);
  const { data: advances, isLoading: isLoadingAdvances } = useCollection<AdvancePayment>(advancePaymentsCollectionGroup);
  
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useActionState(verifyStaffPassword, initialState);

  React.useEffect(() => {
    if (state.message) {
      if (state.errors && Object.keys(state.errors).length > 0) {
        toast({ title: 'Verification Failed', description: state.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: state.message });
        setVerifiedStaffId(selectedStaffId);
        setDialogOpen(false);
      }
    }
  }, [state, toast, selectedStaffId]);

  const handleStaffSelection = (staffId: string) => {
    if (staffId !== verifiedStaffId) {
        setSelectedStaffId(staffId);
        setVerifiedStaffId(null); // Reset verification
        setDialogOpen(true);
    }
  };


  if (isUserLoading || isLoadingStaff ) {
    return <SimpleLogin title="Salary Overview" description="Please sign in to view salary data." />;
  }

  if (!user || !staff) {
    return <SimpleLogin title="Salary Overview" description="Please sign in to view salary data." />;
  }
  
  const selectedStaffInfo = staff.find(s => s.id === verifiedStaffId);
  
  let salaryData: SalaryData | null = null;

  if (selectedStaffInfo && attendance && advances) {
    const totalHours = attendance.reduce((acc, record) => {
        const hours1 = record.checkIn && record.checkOut ? calculateWorkingHours(record.checkIn, record.checkOut) : 0;
        const hours2 = record.checkIn2 && record.checkOut2 ? calculateWorkingHours(record.checkIn2, record.checkOut2) : 0;
        return acc + hours1 + hours2;
    }, 0);

    const totalAdvance = advances.reduce((acc, payment) => acc + payment.amount, 0);

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

  const selectedStaffForDialog = staff.find(s => s.id === selectedStaffId);

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                 <div className='space-y-1.5'>
                    <CardTitle>Salary Details</CardTitle>
                    <CardDescription>Select a staff member to view their salary information.</CardDescription>
                </div>
                 <div className="w-[180px]">
                    <Select onValueChange={handleStaffSelection} value={selectedStaffId ?? ''}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                        <SelectContent>
                            {staff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
        </Card>
        
      {isLoadingAttendance || isLoadingAdvances ? (
        <p>Loading salary data...</p>
      ) : salaryData ? (
         <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Card key={salaryData.staffId} className="flex flex-col">
              <CardHeader>
                <CardTitle>{salaryData.staffName}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-2 text-muted-foreground"><Hourglass className="size-4" />Total Hours</span>
                  <span className="font-medium">{salaryData.totalHours.toFixed(2)} hrs</span>
                </div>
                 <div className="flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4" />Hourly Rate</span>
                  <span className="font-medium">{salaryData.hourlyRate.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="size-4" />Gross Salary</span>
                  <span className="font-medium text-green-600">{salaryData.salaryAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="size-4" />Total Advance</span>
                  <span className="font-medium text-red-600">{salaryData.totalAdvance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-semibold">Balance Payable</span>
                  <span className="text-xl font-bold text-primary">{salaryData.balance.toLocaleString('en-US', { style: 'currency', 'currency': 'USD' })}</span>
                </div>
              </CardContent>
            </Card>
        </div>
      ) : selectedStaffId ? (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
            <KeyRound className="size-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold text-muted-foreground">Verification Required</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Please enter the password for {staff.find(s => s.id === selectedStaffId)?.name} to view their salary data.
            </p>
             <Button onClick={() => setDialogOpen(true)} className="mt-4">Enter Password</Button>
        </div>
      ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
            <CircleSlash className="size-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold text-muted-foreground">No Staff Selected</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Please select a staff member from the dropdown to view their salary details.
            </p>
        </div>
      )}

       <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Verify Identity</DialogTitle>
                    <DialogDescription>
                        To view the salary for {selectedStaffForDialog?.name}, please enter their password.
                    </DialogDescription>
                </DialogHeader>
                <form action={dispatch}>
                    <input type="hidden" name="email" value={user?.email ?? ''} />
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required />
                             {state?.errors?.password && (
                                <p className="text-sm font-medium text-destructive">
                                    {state.errors.password}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <VerifyPasswordButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
