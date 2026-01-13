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
import { UserSearch, Edit } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '../ui/label';

const EDIT_PASSWORD = 'Teamox76@';

export default function AdvancePage() {
  const firestore = useFirestore();

  const staffCollRef = useMemoFirebase(
    () => collection(firestore, 'staff'),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollRef);
  
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<number | null>(null);
  const [selectedYear, setSelectedYear] = React.useState<number | null>(null);
  const { toast } = useToast();
  const [editingRowKey, setEditingRowKey] = React.useState<string | null>(null);
  const [isVerificationOpen, setVerificationOpen] = React.useState(false);
  const [rowToEdit, setRowToEdit] = React.useState<string | null>(null);
  const [passwordInput, setPasswordInput] = React.useState('');

  React.useEffect(() => {
    const currentDate = new Date();
    setSelectedMonth(currentDate.getMonth());
    setSelectedYear(currentDate.getFullYear());
  }, []);

  const monthStartDate = selectedYear !== null && selectedMonth !== null ? startOfMonth(new Date(selectedYear, selectedMonth)) : new Date();
  const monthEndDate = selectedYear !== null && selectedMonth !== null ? endOfMonth(new Date(selectedYear, selectedMonth)) : new Date();

  const advancesQuery = useMemoFirebase(() => {
    if (!selectedStaffId || selectedMonth === null || selectedYear === null) return null;
    return query(
      collection(firestore, `staff/${selectedStaffId}/advancePayments`),
      where('date', '>=', startOfMonth(new Date(selectedYear, selectedMonth))),
      where('date', '<=', endOfMonth(new Date(selectedYear, selectedMonth)))
    );
  }, [firestore, selectedStaffId, selectedMonth, selectedYear]);
  
  const { data: payments, isLoading: isLoadingPayments } = useCollection<AdvancePayment>(advancesQuery);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const daysInMonth = selectedYear !== null && selectedMonth !== null ? eachDayOfInterval({
    start: monthStartDate,
    end: monthEndDate,
  }) : [];

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

  const handleEditClick = (rowKey: string) => {
    setRowToEdit(rowKey);
    setVerificationOpen(true);
  };

  const handleVerification = () => {
    if (passwordInput === EDIT_PASSWORD) {
      if (rowToEdit) {
        setEditingRowKey(rowToEdit);
      }
      toast({
        title: 'Success',
        description: 'Verification successful. You can now edit the amount.',
      });
      setVerificationOpen(false);
      setPasswordInput('');
      setRowToEdit(null);
    } else {
      toast({
        title: 'Error',
        description: 'Incorrect password. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const selectedStaffMember = staff?.find((s) => s.id === selectedStaffId);

  if (selectedMonth === null || selectedYear === null) {
      return (
           <Card>
              <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>Loading...</CardDescription>
              </CardHeader>
              <CardContent className="h-96 flex items-center justify-center">
                  <p>Initializing...</p>
              </CardContent>
           </Card>
      )
  }

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
                  <TableHead className="w-[200px]">Amount</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingStaff || isLoadingPayments ? (
                   <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        Loading...
                    </TableCell>
                  </TableRow>
                ) : !selectedStaffId ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
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
                    const isEditing = editingRowKey === day.toISOString();

                    return (
                      <TableRow key={day.toISOString()}>
                        <TableCell>{format(day, 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            defaultValue={payment?.amount?.toFixed(2) ?? ''}
                            onBlur={(e) =>
                              handleAmountChange(day, e.target.value)
                            }
                            className="w-[120px] text-right"
                            disabled={!selectedStaffId || (!!payment && !isEditing)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {payment && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(day.toISOString())}
                              disabled={isEditing}
                            >
                              <Edit className="size-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No advance payments found for this staff member.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isVerificationOpen} onOpenChange={setVerificationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Password to Edit</DialogTitle>
            <DialogDescription>
              Please enter the admin password to make changes to this record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="edit-password">Password</Label>
            <Input
              id="edit-password"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerification()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setVerificationOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleVerification}>Verify & Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
