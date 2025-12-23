'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Staff, AttendanceRecord, AdvancePayment } from '@/lib/definitions';
import { DollarSign, Clock, Hourglass, CircleSlash } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup } from 'firebase/firestore';
import { calculateWorkingHours } from '@/lib/utils';

interface SalaryData {
  staffId: string;
  staffName: string;
  totalHours: number;
  hourlyRate: number;
  salaryAmount: number;
  totalAdvance: number;
  balance: number;
}

export default function SalaryPage() {
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>('all');
  const firestore = useFirestore();

  const staffCollection = useMemoFirebase(() => collection(firestore, 'staff'), [firestore]);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollection);
  
  const attendanceCollectionGroup = useMemoFirebase(() => collectionGroup(firestore, 'attendance_records'), [firestore]);
  const { data: attendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceCollectionGroup);
  
  const advancePaymentsCollectionGroup = useMemoFirebase(() => collectionGroup(firestore, 'advance_payments'), [firestore]);
  const { data: advances, isLoading: isLoadingAdvances } = useCollection<AdvancePayment>(advancePaymentsCollectionGroup);

  if (isLoadingStaff || isLoadingAttendance || isLoadingAdvances || !staff || !attendance || !advances) {
    return <div>Loading...</div>;
  }

  const salaryData = staff.map(s => {
    const staffAttendance = attendance.filter(a => a.staffId === s.id);
    const staffAdvances = advances.filter(a => a.staffId === s.id);

    const totalHours = staffAttendance.reduce((acc, record) => {
      return acc + calculateWorkingHours(record.checkIn, record.checkOut);
    }, 0);

    const totalAdvance = staffAdvances.reduce((acc, payment) => acc + payment.amount, 0);

    const salaryAmount = totalHours * s.hourlyRate;
    const balance = salaryAmount - totalAdvance;

    return {
      staffId: s.id,
      staffName: s.name,
      totalHours,
      hourlyRate: s.hourlyRate,
      salaryAmount,
      totalAdvance,
      balance,
    };
  });

  const filteredData =
    selectedStaffId === 'all'
      ? salaryData
      : salaryData.filter((s) => s.staffId === selectedStaffId);

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Label htmlFor="staff-filter">Filter by Staff</Label>
        <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
          <SelectTrigger id="staff-filter">
            <SelectValue placeholder="Select staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredData.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredData.map((data) => (
            <Card key={data.staffId} className="flex flex-col">
              <CardHeader>
                <CardTitle>{data.staffName}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-2 text-muted-foreground"><Hourglass className="size-4" />Total Hours</span>
                  <span className="font-medium">{data.totalHours.toFixed(2)} hrs</span>
                </div>
                 <div className="flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4" />Hourly Rate</span>
                  <span className="font-medium">{data.hourlyRate.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="size-4" />Gross Salary</span>
                  <span className="font-medium text-green-600">{data.salaryAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="size-4" />Total Advance</span>
                  <span className="font-medium text-red-600">{data.totalAdvance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-semibold">Balance Payable</span>
                  <span className="text-xl font-bold text-primary">{data.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
            <CircleSlash className="size-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold text-muted-foreground">No Salary Data Available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Salary information for the selected staff could not be found.
            </p>
          </div>
      )}
    </div>
  );
}
