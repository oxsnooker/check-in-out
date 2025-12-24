'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

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
import { UserSearch, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AdvancePage() {
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(
    null
  );
  const [selectedMonth, setSelectedMonth] = React.useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = React.useState<number>(
    new Date().getFullYear()
  );
  const { toast } = useToast();

  const firestore = useFirestore();

  const staffCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } =
    useCollection<Staff>(staffCollection);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStaffId) return null;
    const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const endDate = endOfMonth(new Date(selectedYear, selectedMonth));
    return query(
      collection(firestore, `staff/${selectedStaffId}/advance_payments`),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
  }, [firestore, selectedStaffId, selectedMonth, selectedYear]);

  const { data: payments, isLoading: isLoadingPayments } =
    useCollection<AdvancePayment>(paymentsQuery);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const formatDate = (date: any) => {
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'MMM d, yyyy');
    }
    if (date instanceof Date) {
      return format(date, 'MMM d, yyyy');
    }
    return 'Invalid Date';
  };

  const monthStartDate = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEndDate = endOfMonth(monthStartDate);
  const daysInMonth = eachDayOfInterval({
    start: monthStartDate,
    end: monthEndDate,
  });

  const paymentsMap = React.useMemo(() => {
    if (!payments) return new Map();
    const map = new Map<string, AdvancePayment>();
    payments.forEach((payment) => {
      const paymentDate =
        payment.date instanceof Timestamp ? payment.date.toDate() : payment.date;
      const dayKey = format(paymentDate, 'yyyy-MM-dd');
      map.set(dayKey, payment);
    });
    return map;
  }, [payments]);

  const handleAmountChange = async (day: Date, amountStr: string) => {
    if (!selectedStaffId) return;

    try {
      const amount = parseFloat(amountStr);
      const dayKey = format(day, 'yyyy-MM-dd');
      const existingPayment = paymentsMap.get(dayKey);
      const dayId = format(day, 'yyyyMMdd');
      const paymentRef = doc(
        firestore,
        `staff/${selectedStaffId}/advance_payments`,
        dayId
      );

      if (isNaN(amount) || amount <= 0) {
        // If amount is invalid or zero, delete the record if it exists
        if (existingPayment) {
          await deleteDoc(paymentRef);
          toast({ title: 'Success', description: 'Advance payment removed.' });
        }
        return;
      }

      const paymentData = {
        id: dayId,
        staffId: selectedStaffId,
        date: Timestamp.fromDate(day),
        amount: amount,
      };

      if (existingPayment) {
        // Update existing payment
        await updateDoc(paymentRef, { amount: amount });
      } else {
        // Create new payment
        await setDoc(paymentRef, paymentData);
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

  const handleDelete = async (day: Date) => {
    if (!selectedStaffId) return;

    try {
        const dayId = format(day, 'yyyyMMdd');
        const paymentRef = doc(firestore, `staff/${selectedStaffId}/advance_payments`, dayId);
        await deleteDoc(paymentRef);
        toast({ title: 'Success', description: 'Advance payment deleted.' });
    } catch (error) {
        console.error('Failed to delete advance payment:', error);
        toast({
            title: 'Error',
            description: 'Failed to delete advance payment.',
            variant: 'destructive',
        });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              {selectedStaffId && staff
                ? `Showing payments for ${
                    staff.find((s) => s.id === selectedStaffId)?.name
                  }`
                : 'Select a staff member to see their history.'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Select
              onValueChange={setSelectedStaffId}
              value={selectedStaffId ?? ''}
              disabled={isLoadingStaff}
            >
              <SelectTrigger className="w-[180px]">
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
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPayments ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    Loading payments...
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
                      <TableCell>{formatDate(day)}</TableCell>
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
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    >
                                    <Trash2 className="size-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the advance payment of {payment.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} for {formatDate(day)}.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDelete(day)}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Delete
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
  );
}
