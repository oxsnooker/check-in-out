'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate, isSameDay } from 'date-fns';
import { Timestamp, collection, query, where, doc, setDoc } from 'firebase/firestore';
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
import { Input } from '@/components/ui/input';
import type { Staff, AttendanceRecord } from '@/lib/definitions';
import { UserSearch } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { SimpleLogin } from '@/components/simple-login';

function combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':');
    const newDate = new Date(date);
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return newDate;
}


export default function AttendancePage() {
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth());
  const { toast } = useToast();

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
  
  const toDate = (date: Date | Timestamp) => (date instanceof Timestamp ? date.toDate() : date);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));

  const year = new Date().getFullYear();
  const monthStartDate = startOfMonth(new Date(year, selectedMonth));
  const monthEndDate = endOfMonth(monthStartDate);
  const daysInMonth = eachDayOfInterval({ start: monthStartDate, end: monthEndDate });

  const attendanceMap = React.useMemo(() => {
    if (!records) return new Map();
    const map = new Map<string, AttendanceRecord>();
    records.forEach(record => {
      const dayKey = format(toDate(record.checkIn), 'yyyy-MM-dd');
      map.set(dayKey, record);
    });
    return map;
  }, [records]);

  const handleTimeChange = async (day: Date, field: 'checkIn' | 'checkOut', time: string) => {
    if (!selectedStaffId || !time) return;

    const dayKey = format(day, 'yyyy-MM-dd');
    let existingRecord = attendanceMap.get(dayKey);

    const newTime = combineDateAndTime(day, time);
    let checkInTime = existingRecord ? toDate(existingRecord.checkIn) : newTime;
    let checkOutTime = existingRecord ? toDate(existingRecord.checkOut) : newTime;

    if (field === 'checkIn') {
        checkInTime = newTime;
    } else {
        checkOutTime = newTime;
    }
    
    // If there's no record, we use the same time for both to initialize.
    if (!existingRecord) {
        if (field === 'checkIn') {
            checkOutTime = newTime;
        } else {
            checkInTime = newTime;
        }
    }

    const recordId = existingRecord ? existingRecord.id : dayKey;
    const docRef = doc(firestore, `staff/${selectedStaffId}/attendance_records`, recordId);

    try {
        await setDoc(docRef, {
            staffId: selectedStaffId,
            checkIn: Timestamp.fromDate(checkInTime),
            checkOut: Timestamp.fromDate(checkOutTime),
        }, { merge: true });
        toast({ title: 'Success', description: 'Attendance record updated.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to update attendance.', variant: 'destructive' });
        console.error("Failed to update attendance:", error);
    }
  };


  if (isUserLoading || isLoadingStaff) {
    return <SimpleLogin title="Attendance" description="Please sign in to manage attendance." />;
  }
  
  if (!user || !staff) {
     return <SimpleLogin title="Attendance" description="Please sign in to manage attendance." />;
  }

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
              ) : daysInMonth.length > 0 ? (
                daysInMonth.map((day) => {
                  const record = attendanceMap.get(format(day, 'yyyy-MM-dd'));
                  return (
                    <TableRow key={day.toISOString()}>
                      <TableCell>{format(day, 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                         <Input
                            type="time"
                            defaultValue={record ? format(toDate(record.checkIn), 'HH:mm') : ''}
                            onBlur={(e) => handleTimeChange(day, 'checkIn', e.target.value)}
                            className="w-[120px]"
                         />
                      </TableCell>
                       <TableCell>
                         <Input
                            type="time"
                            defaultValue={record ? format(toDate(record.checkOut), 'HH:mm') : ''}
                            onBlur={(e) => handleTimeChange(day, 'checkOut', e.target.value)}
                            className="w-[120px]"
                         />
                      </TableCell>
                    </TableRow>
                  );
                })
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
