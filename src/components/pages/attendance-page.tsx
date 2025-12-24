'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { calculateWorkingHours } from '@/lib/utils';
import useLocalStorage from '@/hooks/use-local-storage';

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
import { MOCK_STAFF, MOCK_ATTENDANCE } from '@/lib/data';
import { UserSearch } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function AttendancePage() {
  const [staff] = useLocalStorage<Staff[]>('staff', MOCK_STAFF);
  const [records, setRecords] = useLocalStorage<AttendanceRecord[]>('attendance', MOCK_ATTENDANCE);
  
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const { toast } = useToast();

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
    if (!records || !selectedStaffId) return new Map();
    const map = new Map<string, AttendanceRecord>();
    records.filter(r => r.staffId === selectedStaffId).forEach((record) => {
      const dayKey = format(record.checkIn, 'yyyy-MM-dd');
      map.set(dayKey, record);
    });
    return map;
  }, [records, selectedStaffId, selectedMonth, selectedYear]);

  const handleTimeChange = async (
    day: Date,
    field: 'checkIn' | 'checkOut' | 'checkIn2' | 'checkOut2',
    time: string
  ) => {

    try {
      const dayKey = format(day, 'yyyy-MM-dd');
      const existingRecord = attendanceMap.get(dayKey);

      if (!selectedStaffId) {
        toast({
          title: 'Error',
          description: 'Please select a staff member first.',
          variant: 'destructive',
        });
        return;
      }

      if (!time) { // If time is cleared, remove the timestamp
        if (existingRecord) {
          setRecords(prev => prev.map(r => r.id === existingRecord.id ? { ...r, [field]: undefined } : r));
          toast({ title: 'Success', description: 'Attendance time cleared.' });
        }
        return;
      }

      const [hours, minutes] = time.split(':');
      const newDateTime = new Date(day);
      newDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      
      if (existingRecord) {
        setRecords(prev => prev.map(r => r.id === existingRecord.id ? {...r, [field]: newDateTime} : r));
      } else {
        const newRecord: AttendanceRecord = {
            id: uuidv4(),
            staffId: selectedStaffId,
            checkIn: day, // This needs to be set, but will be overwritten if field is checkIn
            ...{[field]: newDateTime}
        };
        // ensure checkIn is set properly
        if(field !== 'checkIn') {
            newRecord.checkIn = day;
        }

        setRecords(prev => [...prev, newRecord]);
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
              {!selectedStaffId ? (
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
                  const checkInDate = record?.checkIn;
                  const checkOutDate = record?.checkOut;
                  const checkIn2Date = record?.checkIn2;
                  const checkOut2Date = record?.checkOut2;

                  const hours1 = calculateWorkingHours(checkInDate, checkOutDate);
                  const hours2 = calculateWorkingHours(checkIn2Date, checkOut2Date);
                  const totalHours = hours1 + hours2;
                  
                  return (
                    <TableRow key={day.toISOString()}>
                      <TableCell>{format(day, 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={checkInDate && checkInDate.getFullYear() === day.getFullYear() && checkInDate.getMonth() === day.getMonth() && checkInDate.getDate() === day.getDate() ? format(checkInDate, 'HH:mm') : ''}
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
