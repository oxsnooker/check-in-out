import type { Staff, AttendanceRecord, AdvancePayment } from './definitions';

export const MOCK_STAFF: Staff[] = [
  { id: '1', name: 'John Doe', hourlyRate: 25, email: 'john.doe@example.com' },
  { id: '2', name: 'Jane Smith', hourlyRate: 30, email: 'jane.smith@example.com' },
  { id: '3', name: 'Peter Jones', hourlyRate: 22, email: 'peter.jones@example.com' },
];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
    {
        id: 'rec1',
        staffId: '1',
        checkIn: new Date('2024-07-29T09:00:00'),
        checkOut: new Date('2024-07-29T17:00:00'),
    },
    {
        id: 'rec2',
        staffId: '1',
        checkIn: new Date('2024-07-30T09:05:00'),
        checkOut: new Date('2024-07-30T17:30:00'),
    },
     {
        id: 'rec3',
        staffId: '2',
        checkIn: new Date('2024-07-29T08:30:00'),
        checkOut: new Date('2024-07-29T16:30:00'),
    },
];

export const MOCK_ADVANCES: AdvancePayment[] = [
    {
        id: 'adv1',
        staffId: '1',
        amount: 200,
        date: new Date('2024-07-15'),
    },
    {
        id: 'adv2',
        staffId: '2',
        amount: 150,
        date: new Date('2024-07-10'),
    }
];
