import { Timestamp } from 'firebase/firestore';

export interface Staff {
  id: string;
  name: string;
  hourlyRate: number;
  email?: string;
  // Password is not stored
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  checkIn: Timestamp | Date;
  checkOut?: Timestamp | Date;
  checkIn2?: Timestamp | Date;
  checkOut2?: Timestamp | Date;
  createdAt?: Timestamp;
}

export interface AdvancePayment {
  id: string;
  staffId: string;
  amount: number;
  date: Timestamp | Date;
  createdAt?: Timestamp;
}
