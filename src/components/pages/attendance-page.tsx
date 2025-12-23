'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { addAttendance, type State } from '@/lib/actions';
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
import type { Staff, AttendanceRecord } from '@/lib/definitions';
import { Calendar, Check, Clock } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? 'Saving...' : 'Save Record'}
      <Check className="ml-2 size-4" />
    </Button>
  );
}

export default function AttendancePage({
  staff,
  initialRecords,
}: {
  staff: Staff[];
  initialRecords: AttendanceRecord[];
}) {
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useFormState(addAttendance, initialState);

  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);

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
        setSelectedStaffId(null);
      }
    }
  }, [state, toast]);

  const filteredRecords = selectedStaffId
    ? initialRecords.filter((record) => record.staffId === selectedStaffId)
    : initialRecords;

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
                <Select name="staffId" onValueChange={setSelectedStaffId} value={selectedStaffId ?? undefined}>
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

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <Input id="date" name="date" type="date" className="pl-10" defaultValue={format(new Date(), 'yyyy-MM-dd')}/>
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                 {state.errors?.date && <p className="text-sm font-medium text-destructive">{state.errors.date}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkIn">Check In</Label>
                   <div className="relative">
                     <Input id="checkIn" name="checkIn" type="time" className="pl-10" />
                     <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                   </div>
                   {state.errors?.checkIn && <p className="text-sm font-medium text-destructive">{state.errors.checkIn}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkOut">Check Out</Label>
                   <div className="relative">
                     <Input id="checkOut" name="checkOut" type="time" className="pl-10" />
                     <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                   </div>
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
              {selectedStaffId ? `Showing records for ${staff.find(s => s.id === selectedStaffId)?.name}` : 'Showing all recent records.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{staff.find((s) => s.id === record.staffId)?.name}</TableCell>
                      <TableCell>{format(record.checkIn, 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(record.checkIn, 'p')}</TableCell>
                      <TableCell>{format(record.checkOut, 'p')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No attendance records found.
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
