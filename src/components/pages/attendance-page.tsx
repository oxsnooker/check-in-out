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
import { UserSearch, Edit } from 'lucide-react';
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
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '../ui/label';

const EDIT_PASSWORD = 'Afzalafu76@';

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
  const [editingRowKey, setEditingRowKey] = React.useState<string | null>(null);
  const [isVerificationOpen, setVerificationOpen] = React.useState(false);
  const [rowToEdit, setRowToEdit] = React.useState<string | null>(null);
  const [passwordInput, setPasswordInput] = React.useState('');


  const monthStartDate = startOfMonth(new Date(selectedYear, selectedMonth));
  const monthEndDate = endOfMonth(monthStartDate);

  const attendanceQuery = useMemoFirebase(() => {
    if (!selectedStaffId) return null;
    return query(
      collection(firestore, `staff/${selectedStaffId}/attendanceRecords`),
      where('date', '>=', monthStartDate),
      where('date', '<=', monthEndDate)
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
      const recordDate = toDate(record.date);
      if (recordDate) {
        const dayKey = format(recordDate, 'yyyy-MM-dd');
        map.set(dayKey, record);
      }
    });
    return map;
  }, [records]);

  const handleTimeChange = async (
    day: Date,
    field: 'timeIn' | 'timeOut' | 'timeIn2' | 'timeOut2',
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

      let newTimestamp: Timestamp | null = null;
      if (time) {
        const [hours, minutes] = time.split(':');
        const newDateTime = new Date(day);
        newDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        newTimestamp = Timestamp.fromDate(newDateTime);
      }
      
      const updatedField = { [field]: newTimestamp };

      if (existingRecord) {
        const recordDocRef = doc(attendanceCollRef, existingRecord.id);
        updateDocumentNonBlocking(recordDocRef, updatedField);
      } else {
        const newRecord: Partial<AttendanceRecord> & { staffId: string; date: Timestamp } = {
          staffId: selectedStaffId,
          date: Timestamp.fromDate(day),
          ...updatedField
        };
        const recordId = format(day, 'yyyyMMdd');
        const recordDocRef = doc(attendanceCollRef, recordId);
        setDocumentNonBlocking(recordDocRef, newRecord, { merge: true });
      }

      toast({
        title: 'Success',
        description: 'Attendance record updated successfully.',
      });
      setEditingRowKey(null); // Disable editing after a change
    } catch (error) {
      console.error('Failed to update attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to update attendance record.',
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = (rowKey: string) => {
    setRowToEdit(rowKey);
    setVerificationOpen(true);
  };

  const handleVerification = () => {
    if (passwordInput === EDIT_PASSWORD) {
      if (rowToEdit) {
        setEditingRowKey(rowToEdit);
      }
      toast({
        title: 'Success',
        description: 'Verification successful. You can now edit the record.',
      });
      setVerificationOpen(false);
      setPasswordInput('');
      setRowToEdit(null);
    } else {
      toast({
        title: 'Error',
        description: 'Incorrect password. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const selectedStaffMember = staff?.find((s) => s.id === selectedStaffId);

  return (
    <>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingStaff || isLoadingRecords ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !selectedStaffId ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
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
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const record = attendanceMap.get(dayKey);
                  const timeIn = toDate(record?.timeIn);
                  const timeOut = toDate(record?.timeOut);
                  const timeIn2 = toDate(record?.timeIn2);
                  const timeOut2 = toDate(record?.timeOut2);

                  const hours1 = calculateWorkingHours(
                    timeIn,
                    timeOut
                  );
                  const hours2 = calculateWorkingHours(
                    timeIn2,
                    timeOut2
                  );
                  const totalHours = hours1 + hours2;
                  const isEditing = editingRowKey === day.toISOString();

                  return (
                    <TableRow key={day.toISOString()}>
                      <TableCell>{format(day, 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={
                            timeIn
                              ? format(timeIn, 'HH:mm')
                              : ''
                          }
                          onBlur={(e) =>
                            handleTimeChange(day, 'timeIn', e.target.value)
                          }
                           disabled={!!timeIn && !isEditing}
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={
                            timeOut
                              ? format(timeOut, 'HH:mm')
                              : ''
                          }
                          onBlur={(e) =>
                            handleTimeChange(day, 'timeOut', e.target.value)
                          }
                          disabled={!!timeOut && !isEditing}
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={
                            timeIn2
                              ? format(timeIn2, 'HH:mm')
                              : ''
                          }
                          onBlur={(e) =>
                            handleTimeChange(day, 'timeIn2', e.target.value)
                          }
                          disabled={!!timeIn2 && !isEditing}
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={
                            timeOut2
                              ? format(timeOut2, 'HH:mm')
                              : ''
                          }
                          onBlur={(e) =>
                            handleTimeChange(day, 'timeOut2', e.target.value)
                          }
                          disabled={!!timeOut2 && !isEditing}
                          className="w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {totalHours.toFixed(2)} hrs
                        </span>
                      </TableCell>
                       <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(day.toISOString())}
                          disabled={isEditing}
                        >
                          <Edit className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
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
     <Dialog open={isVerificationOpen} onOpenChange={setVerificationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Password to Edit</DialogTitle>
            <DialogDescription>
              Please enter the admin password to make changes to this record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="edit-password">Password</Label>
            <Input
              id="edit-password"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerification()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setVerificationOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleVerification}>Verify & Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
