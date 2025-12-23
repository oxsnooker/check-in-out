'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { calculateWorkingHours } from '@/lib/utils';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where, Timestamp, setDoc, doc, updateDoc } from 'firebase/firestore';

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

export default function AttendancePage() {
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(
    null
  );
  const [selectedMonth, setSelectedMonth] = React.useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = React.useState<number>(
    new Date().getFullYear()
  );
  const { toast } = useToast();
  const firestore = useFirestore();

  const staffCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } =
    useCollection<Staff>(staffCollection);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStaffId) return null;
    const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const endDate = endOfMonth(new Date(selectedYear, selectedMonth));
    return query(
      collection(firestore, `staff/${selectedStaffId}/attendance_records`),
      where('checkIn', '>=', startDate),
      where('checkIn', '<=', endDate)
    );
  }, [firestore, selectedStaffId, selectedMonth, selectedYear]);

  const { data: records, isLoading: isLoadingRecords } =
    useCollection<AttendanceRecord>(attendanceQuery);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const monthStartDate = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEndDate = endOfMonth(monthStartDate);
  const daysInMonth = eachDayOfInterval({
    start: monthStartDate,
    end: monthEndDate,
  });

  const attendanceMap = React.useMemo(() => {
    if (!records) return new Map();
    const map = new Map<string, AttendanceRecord>();
    records.forEach((record) => {
      // Firebase Timestamps need to be converted to JS Dates
      const checkInDate = record.checkIn instanceof Timestamp ? record.checkIn.toDate() : record.checkIn;
      const dayKey = format(checkInDate, 'yyyy-MM-dd');
      map.set(dayKey, record);
    });
    return map;
  }, [records]);

  const handleTimeChange = async (
    day: Date,
    field: 'checkIn' | 'checkOut' | 'checkIn2' | 'checkOut2',
    time: string
  ) => {
    if (!selectedStaffId || !time) return;

    try {
      const dayKey = format(day, 'yyyy-MM-dd');
      const existingRecord = attendanceMap.get(dayKey);

      const [hours, minutes] = time.split(':');
      const newDateTime = new Date(day);
      newDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      
      const dayId = format(day, 'yyyyMMdd');

      if (existingRecord) {
        // Update existing record
        const recordRef = doc(firestore, `staff/${selectedStaffId}/attendance_records`, existingRecord.id);
        await updateDoc(recordRef, { [field]: Timestamp.fromDate(newDateTime) });
      } else {
        // Create new record with a predictable ID based on date
        const newRecordRef = doc(firestore, `staff/${selectedStaffId}/attendance_records`, dayId);
        await setDoc(newRecordRef, {
            id: newRecordRef.id,
            staffId: selectedStaffId,
            date: Timestamp.fromDate(day),
            [field]: Timestamp.fromDate(newDateTime)
        }, { merge: true });
      }

      toast({
        title: 'Success',
        description: 'Attendance record updated successfully.',
      });
    } catch (error) {
      console.error('Failed to update attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to update attendance record.',
        variant: 'destructive',
      });
    }
  };

  const toDateSafe = (date: any): Date | null => {
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    return null;
  }


  return (
    <div className="grid grid-cols-1 gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>
              {selectedStaffId && staff
                ? `Showing records for ${
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
                    <TableCell colSpan={6} className="h-24 text-center">
                        Loading records...
                    </TableCell>
                </TableRow>
              ) : !selectedStaffId ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
                  const record = attendanceMap.get(format(day, 'yyyy-MM-dd'));
                  const checkInDate = toDateSafe(record?.checkIn);
                  const checkOutDate = toDateSafe(record?.checkOut);
                  const checkIn2Date = toDateSafe(record?.checkIn2);
                  const checkOut2Date = toDateSafe(record?.checkOut2);

                  const hours1 = calculateWorkingHours(checkInDate, checkOutDate);
                  const hours2 = calculateWorkingHours(checkIn2Date, checkOut2Date);
                  const totalHours = hours1 + hours2;
                  
                  return (
                    <TableRow key={day.toISOString()}>
                      <TableCell>{format(day, 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={checkInDate ? format(checkInDate, 'HH:mm') : ''}
                          onBlur={(e) =>
                            handleTimeChange(day, 'checkIn', e.target.value)
                          }
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={checkOutDate ? format(checkOutDate, 'HH:mm') : ''}
                          onBlur={(e) =>
                            handleTimeChange(day, 'checkOut', e.target.value)
                          }
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={checkIn2Date ? format(checkIn2Date, 'HH:mm') : ''}
                          onBlur={(e) =>
                            handleTimeChange(day, 'checkIn2', e.target.value)
                          }
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={checkOut2Date ? format(checkOut2Date, 'HH:mm') : ''}
                          onBlur={(e) =>
                            handleTimeChange(day, 'checkOut2', e.target.value)
                          }
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {totalHours.toFixed(2)} hrs
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No attendance records found for this staff member for the
                    selected month.
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
