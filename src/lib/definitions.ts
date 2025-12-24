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
  checkIn: Date | Timestamp;
  checkOut?: Date | Timestamp;
  checkIn2?: Date | Timestamp;
  checkOut2?: Date | Timestamp;
}

export interface AdvancePayment {
  id: string;
  staffId: string;
  amount: number;
  date: Date | Timestamp;
}

    