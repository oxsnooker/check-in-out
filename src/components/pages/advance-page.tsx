'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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
  const firestore = useFirestore();

  const staffCollRef = useMemoFirebase(
    () => collection(firestore, 'staff'),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollRef);
  
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const { toast } = useToast();

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
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the advance payment.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(payment.id)}>
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
    </>
  );
}