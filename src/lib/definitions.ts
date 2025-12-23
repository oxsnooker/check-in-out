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
  checkIn: Date;
  checkOut: Date;
  checkIn2?: Date;
  checkOut2?: Date;
  createdAt?: Date;
}

export interface AdvancePayment {
  id: string;
  staffId: string;
  amount: number;
  date: Date;
  createdAt?: Date;
}
