'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Timestamp, collection, query, where } from 'firebase/firestore';

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
import type { Staff, AttendanceRecord } from '@/lib/definitions';
import { UserSearch } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { SimpleLogin } from '@/components/simple-login';

export default function AttendancePage() {
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth());

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const staffCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'staff');
  }, [firestore, user]);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollection);

  const attendanceCollection = useMemoFirebase(() => {
    if (!user || !selectedStaffId) return null;
    const year = new Date().getFullYear();
    const startDate = startOfMonth(new Date(year, selectedMonth));
    const endDate = endOfMonth(new Date(year, selectedMonth));

    return query(
        collection(firestore, `staff/${selectedStaffId}/attendance_records`),
        where('checkIn', '>=', Timestamp.fromDate(startDate)),
        where('checkIn', '<=', Timestamp.fromDate(endDate))
    );
  }, [firestore, user, selectedStaffId, selectedMonth]);

  const { data: records, isLoading: isLoadingRecords } = useCollection<AttendanceRecord>(attendanceCollection);
  
  if (isUserLoading || isLoadingStaff) {
    return <SimpleLogin title="Attendance" description="Please sign in to manage attendance." />;
  }
  
  if (!user || !staff) {
     return <SimpleLogin title="Attendance" description="Please sign in to manage attendance." />;
  }

  const toDate = (date: Date | Timestamp) => (date instanceof Timestamp ? date.toDate() : date);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));


  return (
    <div className="grid grid-cols-1 gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className='space-y-1.5'>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>
                {selectedStaffId ? `Showing records for ${staff.find(s => s.id === selectedStaffId)?.name}` : 'Select a staff member to see their history.'}
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
                <Select onValueChange={(value) => setSelectedMonth(Number(value))} value={String(selectedMonth)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                        {monthOptions.map((month) => (
                            <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
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
                    <TableCell>{format(toDate(record.checkIn), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(toDate(record.checkIn), 'hh:mm a')}</TableCell>
                    <TableCell>{format(toDate(record.checkOut), 'hh:mm a')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No attendance records found for this staff member for the selected month.
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
