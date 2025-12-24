'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import useLocalStorage from '@/hooks/use-local-storage';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Staff, AdvancePayment } from '@/lib/definitions';
import { UserSearch, Trash2, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, query, where, Timestamp } from 'firebase/firestore';
import {
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { toDate } from '@/lib/utils';

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-destructive hover:bg-destructive/90"
    >
      {pending ? 'Verifying...' : 'Verify & Delete'}
      <ShieldCheck className="ml-2 size-4" />
    </Button>
  );
}

export default function AdvancePage() {
  const firestore = useFirestore();

  const staffCollRef = useMemoFirebase(
    () => collection(firestore, 'staff'),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollRef);
  
  const [adminPassword] = useLocalStorage<string>('adminPassword', 'Teamox76@');
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const { toast } = useToast();

  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [paymentToDelete, setPaymentToDelete] = React.useState<AdvancePayment | null>(null);

  const monthStartDate = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEndDate = endOfMonth(new Date(selectedYear, selectedMonth));

  const advancesQuery = useMemoFirebase(() => {
    if (!selectedStaffId) return null;
    return query(
      collection(firestore, `staff/${selectedStaffId}/advancePayments`),
      where('date', '>=', monthStartDate),
      where('date', '<=', monthEndDate)
    );
  }, [firestore, selectedStaffId, selectedMonth, selectedYear]);
  
  const { data: payments, isLoading: isLoadingPayments } = useCollection<AdvancePayment>(advancesQuery);

  function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;
    if (password === adminPassword) {
        toast({ title: 'Success', description: 'Verification successful. Deleting payment...' });
        if(paymentToDelete) {
            handleDelete(paymentToDelete.id);
        }
        setDeleteDialogOpen(false);
        setPaymentToDelete(null);
    } else {
      toast({
        title: 'Verification Failed',
        description: 'Incorrect password.',
        variant: 'destructive',
      });
    }
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const daysInMonth = eachDayOfInterval({
    start: monthStartDate,
    end: monthEndDate,
  });

  const paymentsMap = React.useMemo(() => {
    const map = new Map<string, AdvancePayment>();
    if (!payments) return map;
    payments.forEach((payment) => {
      const paymentDate = toDate(payment.date);
      if (paymentDate) {
        const dayKey = format(paymentDate, 'yyyy-MM-dd');
        map.set(dayKey, payment);
      }
    });
    return map;
  }, [payments]);

  const handleAmountChange = async (day: Date, amountStr: string) => {
    if (!selectedStaffId) return;

    try {
      const amount = parseFloat(amountStr);
      const dayKey = format(day, 'yyyy-MM-dd');
      const existingPayment = paymentsMap.get(dayKey);
      
      const paymentsCollRef = collection(firestore, `staff/${selectedStaffId}/advancePayments`);

      if (isNaN(amount) || amount <= 0) {
        if (existingPayment) {
          const paymentDocRef = doc(paymentsCollRef, existingPayment.id);
          deleteDocumentNonBlocking(paymentDocRef);
          toast({ title: 'Success', description: 'Advance payment removed.' });
        }
        return;
      }

      if (existingPayment) {
        const paymentDocRef = doc(paymentsCollRef, existingPayment.id);
        updateDocumentNonBlocking(paymentDocRef, { amount });
      } else {
        const paymentId = format(day, 'yyyyMMdd');
        const newPayment: Omit<AdvancePayment, 'id'> & { id?: string } = {
          staffId: selectedStaffId,
          date: Timestamp.fromDate(day),
          amount: amount,
        };
        const paymentDocRef = doc(paymentsCollRef, paymentId);
        // Use set with merge to create or update, as a single operation
        setDocumentNonBlocking(paymentDocRef, newPayment, { merge: true });
      }

      toast({
        title: 'Success',
        description: 'Advance payment saved successfully.',
      });
    } catch (error) {
      console.error('Failed to save advance payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to save advance payment.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!selectedStaffId) return;
    const paymentDocRef = doc(firestore, `staff/${selectedStaffId}/advancePayments`, paymentId);
    deleteDocumentNonBlocking(paymentDocRef);
    toast({ title: 'Success', description: 'Advance payment deleted.' });
  };
  
  const openDeleteDialog = (payment: AdvancePayment) => {
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  }

  const selectedStaffMember = staff?.find((s) => s.id === selectedStaffId);

  return (
    <>
      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                {selectedStaffMember
                  ? `Showing payments for ${selectedStaffMember.firstName} ${selectedStaffMember.lastName}`
                  : 'Select a staff member to see their history.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select
                onValueChange={setSelectedStaffId}
                value={selectedStaffId ?? ''}
              >
                <SelectTrigger className="w-[180px]">
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
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right w-[200px]">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingStaff || isLoadingPayments ? (
                   <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                        Loading...
                    </TableCell>
                  </TableRow>
                ) : !selectedStaffId ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserSearch className="size-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Please select a staff member.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : daysInMonth.length > 0 ? (
                  daysInMonth.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const payment = paymentsMap.get(dayKey);

                    return (
                      <TableRow key={day.toISOString()}>
                        <TableCell>{format(day, 'MMM d, yyyy')}</TableCell>
                        <TableCell className="flex items-center justify-end gap-2 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            defaultValue={payment?.amount?.toFixed(2) ?? ''}
                            onBlur={(e) =>
                              handleAmountChange(day, e.target.value)
                            }
                            className="w-[120px] text-right"
                            disabled={!selectedStaffId}
                          />
                          {payment && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(payment)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No advance payments found for this staff member.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       {paymentToDelete && selectedStaffMember &&(
        <Dialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
                 <form onSubmit={handleVerify}>
                    <DialogHeader>
                        <DialogTitle>Verify Deletion</DialogTitle>
                         <DialogDescription>
                            To delete the advance payment of {paymentToDelete.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} for {selectedStaffMember.firstName} {selectedStaffMember.lastName} on {paymentToDelete.date && toDate(paymentToDelete.date) ? format(toDate(paymentToDelete.date)!, 'MMM d, yyyy') : ''}, please enter the admin password.
                        </DialogDescription>
                    </DialogHeader>
                     <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Admin Password</Label>
                            <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                       <DialogClose asChild>
                         <Button type="button" variant="secondary">
                            Cancel
                        </Button>
                       </DialogClose>
                       <VerifyButton />
                    </DialogFooter>
                 </form>
            </DialogContent>
        </Dialog>
       )}
    </>
  );
}

    