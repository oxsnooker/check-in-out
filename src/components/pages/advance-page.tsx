'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';

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
import { UserSearch } from 'lucide-react';

export default function AdvancePage() {
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(
    null
  );
  const firestore = useFirestore();

  const staffCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollection);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStaffId) return null;
    return query(
      collection(firestore, 'advance_payments'),
      where('staffId', '==', selectedStaffId)
    );
  }, [firestore, selectedStaffId]);

  const {
    data: payments,
    isLoading: isLoadingPayments,
  } = useCollection<AdvancePayment>(paymentsQuery);

  const getStaffName = (staffId: string) => {
    return staff?.find((s) => s.id === staffId)?.name || 'Unknown Staff';
  };
  
  const formatDate = (date: any) => {
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'MMM d, yyyy');
    }
    if (date instanceof Date) {
      return format(date, 'MMM d, yyyy');
    }
    return 'Invalid Date';
  }

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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPayments ? (
                 <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        Loading payments...
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
              ) : payments && payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{getStaffName(payment.staffId)}</TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell className="text-right">
                      {payment.amount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </TableCell>
                  </TableRow>
                ))
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
  );
}
