'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addAdvance, type State } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
import { Calendar, DollarSign, Send } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? 'Submitting...' : 'Submit Payment'}
      <Send className="ml-2 size-4" />
    </Button>
  );
}

export default function AdvancePage({
  staff,
  initialPayments,
}: {
  staff: Staff[];
  initialPayments: AdvancePayment[];
}) {
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useActionState(addAdvance, initialState);
  
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (state.message) {
      if (state.errors && Object.keys(state.errors).length > 0) {
        toast({ title: 'Error', description: state.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: state.message });
        formRef.current?.reset();
        setSelectedStaffId(null);
      }
    }
  }, [state, toast]);

  const filteredPayments = selectedStaffId
    ? initialPayments.filter((p) => p.staffId === selectedStaffId)
    : initialPayments;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Record Advance</CardTitle>
            <CardDescription>
              Log an advance payment for a staff member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} action={dispatch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staffId">Staff Member</Label>
                <Select name="staffId" onValueChange={setSelectedStaffId} value={selectedStaffId ?? undefined}>
                  <SelectTrigger id="staffId">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 {state.errors?.staffId && <p className="text-sm font-medium text-destructive">{state.errors.staffId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" className="pl-10" />
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                {state.errors?.amount && <p className="text-sm font-medium text-destructive">{state.errors.amount}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Payment Date</Label>
                <div className="relative">
                  <Input id="date" name="date" type="date" className="pl-10" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                {state.errors?.date && <p className="text-sm font-medium text-destructive">{state.errors.date}</p>}
              </div>

              <SubmitButton />
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
             <CardDescription>
              {selectedStaffId ? `Showing payments for ${staff.find(s => s.id === selectedStaffId)?.name}` : 'Showing all recent payments.'}
            </CardDescription>
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
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{staff.find((s) => s.id === payment.staffId)?.name}</TableCell>
                      <TableCell>{format(payment.date, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {payment.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No advance payments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
