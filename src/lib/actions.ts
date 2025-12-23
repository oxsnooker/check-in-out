'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  getStaff,
  getAttendanceRecords,
  getAdvancePayments,
  setStaff,
  setAttendanceRecords,
  setAdvancePayments
} from './data';
import type { Staff, AttendanceRecord, AdvancePayment } from './definitions';

const FormSchema = z.object({
  id: z.string(),
  staffId: z.string({
    invalid_type_error: 'Please select a staff member.',
  }),
  date: z.string(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  amount: z.coerce.number().positive({ message: 'Please enter an amount greater than $0.' }).optional(),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).optional(),
  hourlyRate: z.coerce.number().positive({ message: 'Please enter a positive hourly rate.' }).optional(),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }).optional(),
});

const AddAttendance = FormSchema.pick({ staffId: true, date: true, checkIn: true, checkOut: true });
const AddAdvance = FormSchema.pick({ staffId: true, amount: true, date: true });
const AddStaff = FormSchema.pick({ name: true, hourlyRate: true, password: true });
const UpdateStaff = FormSchema.pick({ id: true, name: true, hourlyRate: true, password: true });

export type State = {
  errors?: {
    staffId?: string[];
    date?: string[];
    checkIn?: string[];
    checkOut?: string[];
    amount?: string[];
    name?: string[];
    hourlyRate?: string[];
    password?: string[];
  };
  message?: string | null;
};

function combineDateAndTime(date: string, time: string): Date {
    return new Date(`${date}T${time}`);
}

export async function addAttendance(prevState: State, formData: FormData) {
  const validatedFields = AddAttendance.safeParse({
    staffId: formData.get('staffId'),
    date: formData.get('date'),
    checkIn: formData.get('checkIn'),
    checkOut: formData.get('checkOut'),
  });

  if (!validatedFields.data?.date || !validatedFields.data?.checkIn || !validatedFields.data?.checkOut) {
    return {
        errors: {},
        message: 'Missing required fields: date, check-in time, or check-out time.',
    };
  }

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Add Attendance.',
    };
  }

  const { staffId, date, checkIn, checkOut } = validatedFields.data;
  const attendanceRecords = await getAttendanceRecords();
  
  const newRecord: AttendanceRecord = {
    id: Date.now().toString(),
    staffId,
    checkIn: combineDateAndTime(date, checkIn),
    checkOut: combineDateAndTime(date, checkOut),
  };
  
  setAttendanceRecords([...attendanceRecords, newRecord]);

  revalidatePath('/');
  return { message: 'Attendance added successfully.' };
}

export async function addAdvance(prevState: State, formData: FormData) {
    const validatedFields = AddAdvance.safeParse({
      staffId: formData.get('staffId'),
      amount: formData.get('amount'),
      date: formData.get('date'),
    });
  
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Add Advance.',
      };
    }
  
    const { staffId, amount, date } = validatedFields.data;
    const advancePayments = await getAdvancePayments();
    
    const newPayment: AdvancePayment = {
      id: Date.now().toString(),
      staffId,
      amount,
      date: new Date(date),
    };

    setAdvancePayments([...advancePayments, newPayment]);
  
    revalidatePath('/advance');
    return { message: 'Advance payment added successfully.' };
}

export async function addStaff(prevState: State, formData: FormData) {
    const validatedFields = AddStaff.safeParse({
        name: formData.get('name'),
        hourlyRate: formData.get('hourlyRate'),
        password: formData.get('password'),
    });
    
    if (!validatedFields.success) {
        return {
          errors: validatedFields.error.flatten().fieldErrors,
          message: 'Missing Fields. Failed to Add Staff.',
        };
    }

    const { name, hourlyRate, password } = validatedFields.data;
    const staff = await getStaff();
    
    const newStaff: Staff = {
        id: Date.now().toString(),
        name,
        hourlyRate,
        password
    };

    setStaff([...staff, newStaff]);
    revalidatePath('/admin');
    return { message: 'Staff member added successfully.' };
}

export async function updateStaff(prevState: State, formData: FormData) {
    const validatedFields = UpdateStaff.safeParse({
        id: formData.get('id'),
        name: formData.get('name'),
        hourlyRate: formData.get('hourlyRate'),
        password: formData.get('password'),
    });

    if (!validatedFields.success) {
        return {
          errors: validatedFields.error.flatten().fieldErrors,
          message: 'Missing Fields. Failed to Update Staff.',
        };
    }

    const { id, name, hourlyRate, password } = validatedFields.data;
    let staff = await getStaff();
    
    const staffIndex = staff.findIndex(s => s.id === id);
    if(staffIndex === -1) {
        return { message: 'Staff not found.' };
    }
    
    staff[staffIndex] = { ...staff[staffIndex], name, hourlyRate, password: password || staff[staffIndex].password };
    setStaff(staff);
    
    revalidatePath('/admin');
    return { message: 'Staff member updated successfully.' };
}


export async function deleteStaff(staffId: string) {
    try {
        let staff = await getStaff();
        setStaff(staff.filter(s => s.id !== staffId));
        revalidatePath('/admin');
        return { message: 'Staff member deleted.' };
    } catch(error) {
        return { message: 'Database Error: Failed to Delete Staff Member.' };
    }
}
