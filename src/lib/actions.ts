'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Staff } from './definitions';
import { v4 as uuidv4 } from 'uuid';


const FormSchema = z.object({
  id: z.string().optional(),
  staffId: z.string({
    invalid_type_error: 'Please select a staff member.',
  }),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  amount: z.coerce
    .number()
    .positive({ message: 'Please enter an amount greater than $0.' })
    .optional(),
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .optional(),
  hourlyRate: z.coerce
    .number()
    .positive({ message: 'Please enter a positive hourly rate.' })
    .optional(),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }).optional(),
  email: z.string().email({ message: 'Please enter a valid email.' }).optional(),
  date: z.string().optional(),
});

const VerifyPasswordSchema = z.object({
  password: z.string().min(1, { message: 'Password is required.' }),
});


export type State = {
  errors?: {
    staffId?: string[];
    checkInDate?: string[];
    checkOutDate?: string[];
    checkIn?: string[];
    checkOut?: string[];
    amount?: string[];
    name?: string[];
    hourlyRate?: string[];
    password?: string[];
    date?: string[];
    email?: string[];
  };
  message?: string | null;
};

export async function addStaff(prevState: State, formData: FormData) {
  console.log('addStaff called, but database is removed.');
  return { message: 'Staff member added (simulation).' };
}

export async function updateStaff(prevState: State, formData: FormData) {
   console.log('updateStaff called, but database is removed.');
  return { message: 'Staff member updated (simulation).' };
}

export async function deleteStaff(staffId: string) {
   console.log('deleteStaff called, but database is removed.');
   return { message: 'Staff member deleted (simulation).' };
}

export async function addAdvance(prevState: State, formData: FormData) {
  console.log('addAdvance called, but database is removed.');
  return { message: 'Advance added (simulation).' };
}

export async function addAttendance(prevState: State, formData: FormData) {
    console.log('addAttendance called, but database is removed.');
    return { message: 'Attendance added (simulation).' };
}

export async function verifyPassword(prevState: State, formData: FormData) {
  console.log('verifyPassword called, but database is removed. Simulating success.');
  const validatedFields = VerifyPasswordSchema.safeParse({
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Password is required.',
    };
  }

  // In a real app, you would verify the password against the current user's credentials.
  // Since auth is removed, we'll just simulate a successful verification.
  return { message: 'Verification successful.' };
}
