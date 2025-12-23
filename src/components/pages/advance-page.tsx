'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addAdvance, type State } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Timestamp, collection, collectionGroup, query, where } from 'firebase/firestore';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Staff, AdvancePayment } from '@/lib/definitions';
import { Calendar, DollarSign, Send, UserSearch } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { SimpleLogin } from '@/components/simple-login';


export default function AdvancePage() {
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const staffCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'staff');
  }, [firestore, user]);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollection);

  const advancePaymentsCollection = useMemoFirebase(() => {
    if (!user || !selectedStaffId) return null;
    return query(
      collection(firestore, `staff/${selectedStaffId}/advance_payments`)
    );
  }, [firestore, user, selectedStaffId]);

  const { data: payments, isLoading: isLoadingPayments } = useCollection<AdvancePayment>(advancePaymentsCollection);


  if (isUserLoading || isLoadingStaff ) {
    return <SimpleLogin title="Advance Payments" description="Please sign in to manage advance payments." />;
  }
  
  if (!user || !staff) {
     return <SimpleLogin title="Advance Payments" description="Please sign in to manage advance payments." />;
  }

  const toDate = (date: Date | Timestamp) => (date instanceof Timestamp ? date.toDate() : date);

  return (
    <div className="grid grid-cols-1 gap-8">
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className='space-y-1.5'>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                {selectedStaffId ? `Showing payments for ${staff.find(s => s.id === selectedStaffId)?.name}` : 'Select a staff member to see their history.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
                 <Select onValueChange={setSelectedStaffId} value={selectedStaffId ?? ''}>
                    <SelectTrigger className="w-[180px]">
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
                    <TableCell colSpan={3} className="text-center">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : !selectedStaffId ? (
                   <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserSearch className="size-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Please select a staff member.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : payments && payments.length > 0 ? (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{staff.find((s) => s.id === payment.staffId)?.name}</TableCell>
                      <TableCell>{format(toDate(payment.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {payment.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
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
