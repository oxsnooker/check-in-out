import { Timestamp } from "firebase/firestore";

export interface Staff {
  id: string;
  name: string;
  hourlyRate: number;
  email?: string;
  // Password is not stored in Firestore document
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  checkIn: Date | Timestamp;
  checkOut: Date | Timestamp;
  createdAt?: Date | Timestamp;
}

export interface AdvancePayment {
  id: string;
  staffId: string;
  amount: number;
  date: Date | Timestamp;
  createdAt?: Date | Timestamp;
}
