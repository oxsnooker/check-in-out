'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

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
    .min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }).optional(),
  hourlyRate: z.coerce
    .number()
    .positive({ message: 'Please enter a positive hourly rate.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' })
    .optional(),
  date: z.string().optional(),
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
    email?: string[];
    hourlyRate?: string[];
    password?: string[];
    date?: string[];
  };
  message?: string | null;
};

export async function addStaff(prevState: State, formData: FormData) {
  const AddStaffSchema = FormSchema.pick({ name: true, hourlyRate: true });
  const validatedFields = AddStaffSchema.safeParse({
    name: formData.get('name'),
    hourlyRate: formData.get('hourlyRate'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to add staff. Please check the fields.',
    };
  }
  
  revalidatePath('/admin');
  return { message: 'Staff member added successfully.' };
}

export async function updateStaff(prevState: State, formData: FormData) {
  const UpdateStaffSchema = FormSchema.pick({ id: true, name: true, hourlyRate: true });
   const validatedFields = UpdateStaffSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    hourlyRate: formData.get('hourlyRate'),
  });

   if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to update staff. Please check the fields.',
    };
  }

  const { id } = validatedFields.data;

  if (!id) {
    return { message: 'Staff ID is missing.' };
  }

  revalidatePath('/admin');
  return { message: 'Staff member updated successfully.' };
}

export async function deleteStaff(staffId: string): Promise<{ success: boolean; message: string }> {
    if (!staffId) {
        return { success: false, message: 'Staff ID is required.' };
    }
    revalidatePath('/admin');
    return { success: true, message: 'Staff member deleted.' };
}


export async function addAdvance(prevState: State, formData: FormData) {
  const AddAdvanceSchema = FormSchema.pick({ staffId: true, amount: true, date: true });
  const validatedFields = AddAdvanceSchema.safeParse({
    staffId: formData.get('staffId'),
    amount: formData.get('amount'),
    date: formData.get('date'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to add advance. Please check the fields.',
    };
  }

  revalidatePath('/advance');
  return { message: 'Advance payment added successfully.' };
}
