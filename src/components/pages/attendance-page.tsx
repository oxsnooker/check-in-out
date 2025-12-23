'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate, isSameDay } from 'date-fns';
import { Timestamp, collection, query, where, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { calculateWorkingHours } from '@/lib/utils';

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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';

function combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':');
    const newDate = new Date(date);
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return newDate;
}


export default function AttendancePage() {
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const { toast } = useToast();

  const firestore = useFirestore();

  const staffCollection = useMemoFirebase(() => {
    return collection(firestore, 'staff');
  }, [firestore]);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollection);

  const attendanceCollection = useMemoFirebase(() => {
    if (!selectedStaffId) return null;
    
    const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const endDate = endOfMonth(new Date(selectedYear, selectedMonth));

    return query(
        collection(firestore, `staff/${selectedStaffId}/attendance_records`),
        where('checkIn', '>=', Timestamp.fromDate(startDate)),
        where('checkIn', '<=', Timestamp.fromDate(endDate))
    );
  }, [firestore, selectedStaffId, selectedMonth, selectedYear]);

  const { data: records, isLoading: isLoadingRecords } = useCollection<AttendanceRecord>(attendanceCollection);
  
  const toDate = (date: Date | Timestamp) => (date instanceof Timestamp ? date.toDate() : date);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const monthStartDate = startOfMonth(new Date(selectedYear, selectedMonth));
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

  const handleTimeChange = async (day: Date, field: 'checkIn' | 'checkOut' | 'checkIn2' | 'checkOut2', time: string) => {
    if (!selectedStaffId) return;

    const dayKey = format(day, 'yyyy-MM-dd');
    const existingRecord = attendanceMap.get(dayKey);

    const update: Partial<AttendanceRecord> = {
        staffId: selectedStaffId,
    };

    if (time) {
        update[field] = Timestamp.fromDate(combineDateAndTime(day, time));
    } else {
        // If time is cleared, we should remove it from the record
        update[field] = undefined;
    }
    
    // If it's a new entry and checkIn is not set, initialize it
    if (!existingRecord && !update.checkIn) {
        // Set a default or handle as an incomplete record.
        // For now, let's just initialize the required fields.
        const newTime = time ? combineDateAndTime(day, time) : new Date(day);
        update.checkIn = Timestamp.fromDate(newTime);
        update.checkOut = Timestamp.fromDate(newTime);
    }

    const recordId = existingRecord ? existingRecord.id : dayKey;
    const docRef = doc(firestore, `staff/${selectedStaffId}/attendance_records`, recordId);

    try {
        await setDoc(docRef, update, { merge: true });
        toast({ title: 'Success', description: 'Attendance record updated.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to update attendance.', variant: 'destructive' });
        console.error("Failed to update attendance:", error);
    }
  };


  if (isLoadingStaff) {
    return <p>Loading...</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className='space-y-1.5'>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>
                {selectedStaffId && staff ? `Showing records for ${staff.find(s => s.id === selectedStaffId)?.name}` : 'Select a staff member to see their history.'}
              </CardDescription>
          </div>
            <div className="flex items-center gap-4">
                 <Select onValueChange={setSelectedStaffId} value={selectedStaffId ?? ''}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                        {staff && staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select onValueChange={(value) => setSelectedMonth(Number(value))} value={String(selectedMonth)}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                        {monthOptions.map((month) => (
                            <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select onValueChange={(value) => setSelectedYear(Number(value))} value={String(selectedYear)}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                        {yearOptions.map((year) => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
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
                <TableHead>Shift 1 Check In</TableHead>
                <TableHead>Shift 1 Check Out</TableHead>
                <TableHead>Shift 2 Check In</TableHead>
                <TableHead>Shift 2 Check Out</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRecords ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading records...
                  </TableCell>
                </TableRow>
              ) : !selectedStaffId ? (
                  <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserSearch className="size-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Please select a staff member.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : daysInMonth.length > 0 ? (
                daysInMonth.map((day) => {
                  const record = attendanceMap.get(format(day, 'yyyy-MM-dd'));
                  const hours1 = record?.checkIn && record?.checkOut ? calculateWorkingHours(record.checkIn, record.checkOut) : 0;
                  const hours2 = record?.checkIn2 && record?.checkOut2 ? calculateWorkingHours(record.checkIn2, record.checkOut2) : 0;
                  const totalHours = hours1 + hours2;
                  return (
                    <TableRow key={day.toISOString()}>
                      <TableCell>{format(day, 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                         <Input
                            type="time"
                            defaultValue={record?.checkIn ? format(toDate(record.checkIn), 'HH:mm') : ''}
                            onBlur={(e) => handleTimeChange(day, 'checkIn', e.target.value)}
                            className="w-[120px]"
                         />
                      </TableCell>
                       <TableCell>
                         <Input
                            type="time"
                            defaultValue={record?.checkOut ? format(toDate(record.checkOut), 'HH:mm') : ''}
                            onBlur={(e) => handleTimeChange(day, 'checkOut', e.target.value)}
                            className="w-[120px]"
                         />
                      </TableCell>
                      <TableCell>
                         <Input
                            type="time"
                            defaultValue={record?.checkIn2 ? format(toDate(record.checkIn2), 'HH:mm') : ''}
                            onBlur={(e) => handleTimeChange(day, 'checkIn2', e.target.value)}
                            className="w-[120px]"
                         />
                      </TableCell>
                       <TableCell>
                         <Input
                            type="time"
                            defaultValue={record?.checkOut2 ? format(toDate(record.checkOut2), 'HH:mm') : ''}
                            onBlur={(e) => handleTimeChange(day, 'checkOut2', e.target.value)}
                            className="w-[120px]"
                         />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{totalHours.toFixed(2)} hrs</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
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
