'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Staff, AttendanceRecord, AdvancePayment } from '@/lib/definitions';
import { DollarSign, Clock, Hourglass, CircleSlash } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, collectionGroup, query, where } from 'firebase/firestore';
import { calculateWorkingHours } from '@/lib/utils';
import { SimpleLogin } from '@/components/simple-login';

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
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const staffCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'staff')
  }, [firestore, user]);
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollection);
  
  const attendanceCollectionGroup = useMemoFirebase(() => {
    if (!user) return null;
    return query(collectionGroup(firestore, 'attendance_records'), where('staffId', '==', user.uid));
  }, [firestore, user]);
  const { data: attendance, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceCollectionGroup);
  
  const advancePaymentsCollectionGroup = useMemoFirebase(() => {
    if (!user) return null;
    return query(collectionGroup(firestore, 'advance_payments'), where('staffId', '==', user.uid));
  }, [firestore, user]);
  const { data: advances, isLoading: isLoadingAdvances } = useCollection<AdvancePayment>(advancePaymentsCollectionGroup);

  if (isUserLoading || isLoadingStaff || isLoadingAttendance || isLoadingAdvances) {
    return <SimpleLogin title="Salary Overview" description="Please sign in to view your salary." />;
  }

  if (!user || !staff || !attendance || !advances) {
    return <SimpleLogin title="Salary Overview" description="Please sign in to view your salary." />;
  }

  const currentUserStaffInfo = staff.find(s => s.id === user.uid);

  if (!currentUserStaffInfo) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
            <CircleSlash className="size-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold text-muted-foreground">Salary Data Not Available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your staff profile could not be found. Please contact an administrator.
            </p>
        </div>
    );
  }

  const totalHours = attendance.reduce((acc, record) => {
      const hours1 = record.checkIn && record.checkOut ? calculateWorkingHours(record.checkIn, record.checkOut) : 0;
      const hours2 = record.checkIn2 && record.checkOut2 ? calculateWorkingHours(record.checkIn2, record.checkOut2) : 0;
      return acc + hours1 + hours2;
  }, 0);

  const totalAdvance = advances.reduce((acc, payment) => acc + payment.amount, 0);

  const salaryAmount = totalHours * currentUserStaffInfo.hourlyRate;
  const balance = salaryAmount - totalAdvance;

  const salaryData: SalaryData = {
    staffId: user.uid,
    staffName: currentUserStaffInfo.name,
    totalHours,
    hourlyRate: currentUserStaffInfo.hourlyRate,
    salaryAmount,
    totalAdvance,
    balance,
  };


  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card key={salaryData.staffId} className="flex flex-col">
            <CardHeader>
              <CardTitle>{salaryData.staffName}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2 text-muted-foreground"><Hourglass className="size-4" />Total Hours</span>
                <span className="font-medium">{salaryData.totalHours.toFixed(2)} hrs</span>
              </div>
               <div className="flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4" />Hourly Rate</span>
                <span className="font-medium">{salaryData.hourlyRate.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="size-4" />Gross Salary</span>
                <span className="font-medium text-green-600">{salaryData.salaryAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="size-4" />Total Advance</span>
                <span className="font-medium text-red-600">{salaryData.totalAdvance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-semibold">Balance Payable</span>
                <span className="text-xl font-bold text-primary">{salaryData.balance.toLocaleString('en-US', { style: 'currency', 'currency': 'USD' })}</span>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
