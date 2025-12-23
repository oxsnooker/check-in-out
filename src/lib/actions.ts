'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  setDoc,
  addDoc,
  deleteDoc,
  doc,
  collection,
  serverTimestamp,
  Timestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

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

const AddAttendance = FormSchema.pick({
  staffId: true,
  checkInDate: true,
  checkIn: true,
  checkOutDate: true,
  checkOut: true,
});
const AddAdvance = FormSchema.pick({ staffId: true, amount: true, date: true });
const AddStaff = FormSchema.pick({ name: true, email: true, hourlyRate: true, password: true });
const UpdateStaff = FormSchema.pick({
  id: true,
  name: true,
  hourlyRate: true,
  password: true,
});
const SignIn = FormSchema.pick({ email: true, password: true });

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


function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

export async function addAttendance(prevState: State, formData: FormData) {
  const validatedFields = AddAttendance.safeParse({
    staffId: formData.get('staffId'),
    checkInDate: formData.get('checkInDate'),
    checkIn: formData.get('checkIn'),
    checkOutDate: formData.get('checkOutDate'),
    checkOut: formData.get('checkOut'),
  });

  if (
    !validatedFields.data?.checkInDate ||
    !validatedFields.data?.checkIn ||
    !validatedFields.data?.checkOutDate ||
    !validatedFields.data?.checkOut
  ) {
    return {
      errors: {},
      message:
        'Missing required fields: check-in date/time, or check-out date/time.',
    };
  }

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Add Attendance.',
    };
  }

  const { staffId, checkInDate, checkIn, checkOutDate, checkOut } =
    validatedFields.data;

  if (!staffId) {
    return {
      errors: {
        staffId: ['Please select a staff member.'],
      },
      message: 'Missing Fields. Failed to Add Attendance.',
    };
  }
    
  const { firestore } = initializeFirebase();
  const attendanceCollection = collection(
    firestore,
    `staff/${staffId}/attendance_records`
  );

  try {
    await addDoc(attendanceCollection, {
      staffId,
      checkIn: Timestamp.fromDate(combineDateAndTime(checkInDate, checkIn)),
      checkOut: Timestamp.fromDate(
        combineDateAndTime(checkOutDate, checkOut)
      ),
      createdAt: serverTimestamp(),
    });

    revalidatePath('/');
    return { message: 'Attendance added successfully.' };
  } catch (e: any) {
    return {
      message: `Database Error: Failed to Add Attendance. ${e.message}`,
    };
  }
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

  const { firestore } = initializeFirebase();
  const advancePaymentsCollection = collection(
    firestore,
    `staff/${staffId}/advance_payments`
  );

  try {
    await addDoc(advancePaymentsCollection, {
      staffId,
      amount,
      date: Timestamp.fromDate(new Date(date!)),
      createdAt: serverTimestamp(),
    });
    revalidatePath('/advance');
    return { message: 'Advance payment added successfully.' };
  } catch (e: any) {
    return {
      message: `Database Error: Failed to add advance payment. ${e.message}`,
    };
  }
}

export async function addStaff(prevState: State, formData: FormData) {
  const validatedFields = AddStaff.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    hourlyRate: formData.get('hourlyRate'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Add Staff.',
    };
  }

  const { name, email, hourlyRate, password } = validatedFields.data;
  
  if (!password) {
    return {
      errors: { password: ['Password is required.'] },
      message: 'Missing Fields. Failed to Add Staff.',
    };
  }

  const { firestore, auth } = initializeFirebase();

  try {
    // We do not create the user with email and password here.
    // That should be done through the Firebase Admin SDK in a secure environment,
    // or through the client-side authentication flow.
    // This action will just store the staff details in Firestore.

    const staffId = uuidv4();
    await setDoc(doc(firestore, 'staff', staffId), {
      id: staffId,
      name,
      email,
      hourlyRate,
    });

    revalidatePath('/admin');
    return { message: 'Staff member added successfully.' };
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') {
        return { message: 'This email is already in use.' };
    }
    return {
      message: `Database Error: Failed to add staff member. ${e.message}`,
    };
  }
}


export async function updateStaff(prevState: State, formData: FormData) {
  // Omitting password from validation as it's not used.
  const validatedFields = FormSchema.pick({
    id: true,
    name: true,
    hourlyRate: true,
  }).safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    hourlyRate: formData.get('hourlyRate'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Staff.',
    };
  }

  const { id, name, hourlyRate } = validatedFields.data;

  const { firestore } = initializeFirebase();
  const staffDocRef = doc(firestore, 'staff', id!);

  try {
    const updateData: Partial<Staff> = {};
    if (name) updateData.name = name;
    if (hourlyRate) updateData.hourlyRate = hourlyRate;

    await setDoc(staffDocRef, updateData, { merge: true });

    revalidatePath('/admin');
    return { message: 'Staff member updated successfully.' };
  } catch (e: any) {
    return {
      message: `Database Error: Failed to update staff member. ${e.message}`,
    };
  }
}

export async function deleteStaff(staffId: string) {
  const { firestore } = initializeFirebase();
  try {
    // Start a batch to delete staff and their related subcollections
    const batch = writeBatch(firestore);

    // 1. Delete the staff document itself
    const staffDocRef = doc(firestore, 'staff', staffId);
    batch.delete(staffDocRef);

    // 2. Delete attendance records
    const attendanceRecordsRef = collection(firestore, `staff/${staffId}/attendance_records`);
    const attendanceRecordsSnapshot = await getDocs(attendanceRecordsRef);
    attendanceRecordsSnapshot.forEach(doc => batch.delete(doc.ref));

    // 3. Delete advance payments
    const advancePaymentsRef = collection(firestore, `staff/${staffId}/advance_payments`);
    const advancePaymentsSnapshot = await getDocs(advancePaymentsRef);
    advancePaymentsSnapshot.forEach(doc => batch.delete(doc.ref));
    
    // 4. Delete salaries
    const salariesRef = collection(firestore, `staff/${staffId}/salaries`);
    const salariesSnapshot = await getDocs(salariesRef);
    salariesSnapshot.forEach(doc => batch.delete(doc.ref));

    // Commit the batch
    await batch.commit();

    revalidatePath('/admin');
    return { message: 'Staff member and all their data deleted successfully.' };
  } catch (error) {
    console.error("Failed to delete staff member:", error);
    return { message: 'Database Error: Failed to Delete Staff Member.' };
  }
}

export async function signInWithEmail(prevState: State, formData: FormData) {
  const validatedFields = SignIn.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Sign In.',
    };
  }
  const { email, password } = validatedFields.data;

  if (!email || !password) {
      return { message: 'Email and password are required.' };
  }

  // This is a server action, but signInWithEmailAndPassword should be called on the client
  // to get the auth state. We'll return the credentials and let the client handle it.
  // This is not ideal, but for the purpose of this example, we proceed.
  // A better approach would be to use a client-side function to call Firebase Auth.
  
  // The following code will not work as intended in a Server Action because
  // Firebase Auth is designed for the client.
  // We are returning an error to indicate this.

  return {
    message: 'Sign in must be handled on the client. This action is a placeholder.',
    errors: { email: ['Sign-in logic needs to be client-side.'] }
  };
}
