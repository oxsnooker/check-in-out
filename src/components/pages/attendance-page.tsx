'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addAttendance, type State } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Timestamp, collection, query, where } from 'firebase/firestore';

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
import type { Staff, AttendanceRecord } from '@/lib/definitions';
import { Calendar, Check, Clock, UserSearch } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { SimpleLogin } from '@/components/simple-login';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? 'Saving...' : 'Save Record'}
      <Check className="ml-2 size-4" />
    </Button>
  );
}

export default function AttendancePage() {
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useActionState(addAttendance, initialState);

  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const staffCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'staff');
  }, [firestore, user]);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollection);

  const attendanceCollection = useMemoFirebase(() => {
    if (!user || !selectedStaffId) return null;
    return query(collection(firestore, `staff/${selectedStaffId}/attendance_records`));
  }, [firestore, user, selectedStaffId]);
  const { data: records, isLoading: isLoadingRecords } = useCollection<AttendanceRecord>(attendanceCollection);


  React.useEffect(() => {
    if (state.message) {
      if (state.errors && Object.keys(state.errors).length > 0) {
        toast({
          title: 'Error',
          description: state.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: state.message,
        });
        formRef.current?.reset();
        // Keep selected staff ID
      }
    }
  }, [state, toast]);
  
  if (isUserLoading || isLoadingStaff) {
    return <SimpleLogin title="Attendance" description="Please sign in to manage attendance." />;
  }
  
  if (!user || !staff) {
     return <SimpleLogin title="Attendance" description="Please sign in to manage attendance." />;
  }

  const toDate = (date: Date | Timestamp) => (date instanceof Timestamp ? date.toDate() : date);


  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Log New Record</CardTitle>
            <CardDescription>
              Select staff and enter their times.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} action={dispatch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staffId">Staff Member</Label>
                <Select name="staffId" onValueChange={setSelectedStaffId} value={selectedStaffId ?? ''}>
                  <SelectTrigger id="staffId">
                    <SelectValue placeholder="Select a staff member" />
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

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Check In</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Input id="checkInDate" name="checkInDate" type="date" className="pl-10" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                    <div className="relative">
                      <Input id="checkIn" name="checkIn" type="time" className="pl-10" />
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                  </div>
                  {state.errors?.checkInDate && <p className="text-sm font-medium text-destructive">{state.errors.checkInDate}</p>}
                  {state.errors?.checkIn && <p className="text-sm font-medium text-destructive">{state.errors.checkIn}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Check Out</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Input id="checkOutDate" name="checkOutDate" type="date" className="pl-10" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                    <div className="relative">
                      <Input id="checkOut" name="checkOut" type="time" className="pl-10" />
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                  </div>
                  {state.errors?.checkOutDate && <p className="text-sm font-medium text-destructive">{state.errors.checkOutDate}</p>}
                  {state.errors?.checkOut && <p className="text-sm font-medium text-destructive">{state.errors.checkOut}</p>}
                </div>
              </div>
              
              <SubmitButton />
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>
              {selectedStaffId ? `Showing records for ${staff.find(s => s.id === selectedStaffId)?.name}` : 'Select a staff member to see their history.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRecords ? (
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
                ) : records && records.length > 0 ? (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{staff.find((s) => s.id === record.staffId)?.name}</TableCell>
                      <TableCell>{format(toDate(record.checkIn), 'MMM d, yyyy, hh:mm a')}</TableCell>
                      <TableCell>{format(toDate(record.checkOut), 'MMM d, yyyy, hh:mm a')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No attendance records found for this staff member.
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
