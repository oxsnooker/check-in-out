import type { Timestamp } from 'firebase/firestore';

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  hourlyRate: number;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: Date | Timestamp;
  timeIn?: Date | Timestamp;
  timeOut?: Date | Timestamp;
  timeIn2?: Date | Timestamp;
  timeOut2?: Date | Timestamp;
}

export interface AdvancePayment {
  id: string;
  staffId: string;
  amount: number;
  date: Date | Timestamp;
}
