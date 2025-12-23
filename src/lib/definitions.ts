export interface Staff {
  id: string;
  name: string;
  hourlyRate: number;
  password?: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  checkIn: Date;
  checkOut: Date;
}

export interface AdvancePayment {
  id: string;
  staffId: string;
  amount: number;
  date: Date;
}
