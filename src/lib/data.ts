import type { Staff, AttendanceRecord, AdvancePayment } from './definitions';

let staff: Staff[] = [
  { id: '1', name: 'John Doe', hourlyRate: 20, password: 'password123' },
  { id: '2', name: 'Jane Smith', hourlyRate: 25, password: 'password123' },
  { id: '3', name: 'Peter Jones', hourlyRate: 22, password: 'password123' },
];

let attendanceRecords: AttendanceRecord[] = [
  {
    id: '1',
    staffId: '1',
    checkIn: new Date(new Date().setDate(new Date().getDate() - 1)),
    checkOut: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(17)),
  },
  {
    id: '2',
    staffId: '2',
    checkIn: new Date(new Date().setDate(new Date().getDate() - 1)),
    checkOut: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(18)),
  },
];

let advancePayments: AdvancePayment[] = [
  { id: '1', staffId: '1', amount: 200, date: new Date(new Date().setDate(15)) },
];

// Simulate API latency
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getStaff() {
  await delay(100);
  return staff;
}

export async function getStaffById(id: string) {
    await delay(100);
    return staff.find(s => s.id === id);
}

export async function getAttendanceRecords() {
  await delay(100);
  return attendanceRecords;
}

export async function getAdvancePayments() {
  await delay(100);
  return advancePayments;
}

export function setStaff(newStaff: Staff[]) {
    staff = newStaff;
}

export function setAttendanceRecords(newRecords: AttendanceRecord[]) {
    attendanceRecords = newRecords;
}

export function setAdvancePayments(newPayments: AdvancePayment[]) {
    advancePayments = newPayments;
}
