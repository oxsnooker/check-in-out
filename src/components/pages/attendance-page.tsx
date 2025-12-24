'use client';

import * as React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { calculateWorkingHours, toDate } from '@/lib/utils';
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
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  doc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import {
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';

export default function AttendancePage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const staffCollRef = useMemoFirebase(
    () => collection(firestore, 'staff'),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollRef);

  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(
    null
  );
  const [selectedMonth, setSelectedMonth] = React.useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = React.useState<number>(
    new Date().getFullYear()
  );

  const monthStartDate = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEndDate = endOfMonth(monthStartDate);

  const attendanceQuery = useMemoFirebase(() => {
    if (!selectedStaffId) return null;
    return query(
      collection(firestore, `staff/${selectedStaffId}/attendanceRecords`),
      where('checkIn', '>=', monthStartDate),
      where('checkIn', '<=', monthEndDate)
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

  const daysInMonth = eachDayOfInterval({
    start: monthStartDate,
    end: monthEndDate,
  });

  const attendanceMap = React.useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    if (!records) return map;
    records.forEach((record) => {
      const checkInDate = toDate(record.checkIn);
      if (checkInDate) {
        const dayKey = format(checkInDate, 'yyyy-MM-dd');
        map.set(dayKey, record);
      }
    });
    return map;
  }, [records]);

  const handleTimeChange = async (
    day: Date,
    field: 'checkIn' | 'checkOut' | 'checkIn2' | 'checkOut2',
    time: string
  ) => {
    if (!selectedStaffId) {
      toast({
        title: 'Error',
        description: 'Please select a staff member first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const dayKey = format(day, 'yyyy-MM-dd');
      const existingRecord = attendanceMap.get(dayKey);
      const attendanceCollRef = collection(
        firestore,
        `staff/${selectedStaffId}/attendanceRecords`
      );

      if (!time) {
        if (existingRecord) {
          const recordDocRef = doc(attendanceCollRef, existingRecord.id);
          updateDocumentNonBlocking(recordDocRef, { [field]: null });
          toast({
            title: 'Success',
            description: 'Attendance time cleared.',
          });
        }
        return;
      }

      const [hours, minutes] = time.split(':');
      const newDateTime = new Date(day);
      newDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      const newTimestamp = Timestamp.fromDate(newDateTime);

      if (existingRecord) {
        const recordDocRef = doc(attendanceCollRef, existingRecord.id);
        updateDocumentNonBlocking(recordDocRef, { [field]: newTimestamp });
      } else {
        const newRecord = {
          staffId: selectedStaffId,
          checkIn: field === 'checkIn' ? newTimestamp : Timestamp.fromDate(day),
          [field]: newTimestamp,
        };
        const recordId = format(day, 'yyyyMMdd');
        const recordDocRef = doc(attendanceCollRef, recordId);
        setDocumentNonBlocking(recordDocRef, newRecord, { merge: true });
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

  const selectedStaffMember = staff?.find((s) => s.id === selectedStaffId);

  return (
    <div className="grid grid-cols-1 gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>
              {selectedStaffMember
                ? `Showing records for ${selectedStaffMember.firstName} ${selectedStaffMember.lastName}`
                : 'Select a staff member to see their history.'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Select
              onValueChange={setSelectedStaffId}
              value={selectedStaffId ?? ''}
            >
              <SelectTrigger className="w-[220px]">
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
                <TableHead>Shift 1 Check In</TableHead>
                <TableHead>Shift 1 Check Out</TableHead>
                <TableHead>Shift 2 Check In</TableHead>
                <TableHead>Shift 2 Check Out</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingStaff || isLoadingRecords ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading...
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
                  const checkInDate = toDate(record?.checkIn);
                  const checkOutDate = toDate(record?.checkOut);
                  const checkIn2Date = toDate(record?.checkIn2);
                  const checkOut2Date = toDate(record?.checkOut2);

                  const hours1 = calculateWorkingHours(
                    checkInDate,
                    checkOutDate
                  );
                  const hours2 = calculateWorkingHours(
                    checkIn2Date,
                    checkOut2Date
                  );
                  const totalHours = hours1 + hours2;

                  return (
                    <TableRow key={day.toISOString()}>
                      <TableCell>{format(day, 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={
                            checkInDate
                              ? format(checkInDate, 'HH:mm')
                              : ''
                          }
                          onBlur={(e) =>
                            handleTimeChange(day, 'checkIn', e.target.value)
                          }
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={
                            checkOutDate
                              ? format(checkOutDate, 'HH:mm')
                              : ''
                          }
                          onBlur={(e) =>
                            handleTimeChange(day, 'checkOut', e.target.value)
                          }
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={
                            checkIn2Date
                              ? format(checkIn2Date, 'HH:mm')
                              : ''
                          }
                          onBlur={(e) =>
                            handleTimeChange(day, 'checkIn2', e.target.value)
                          }
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={
                            checkOut2Date
                              ? format(checkOut2Date, 'HH:mm')
                              : ''
                          }
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

    