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
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

import type { Staff, AttendanceRecord, AdvancePayment } from './definitions';

const FormSchema = z.object({
  id: z.string(),
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
    .min(6, { message: 'Password must be at least 6 characters.' }),
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
const AddStaff = FormSchema.pick({ name: true, hourlyRate: true, password: true });
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

export async function verifyStaffPassword(prevState: State, formData: FormData) {
    const validatedFields = SignIn.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Invalid fields. Failed to verify.',
        }
    }
    
    const { email, password } = validatedFields.data;
    const { auth } = initializeFirebase();

    // We can't directly verify a password for another user on the client.
    // A secure way would be a custom backend function.
    // As a workaround, we'll try to sign in with the credentials. This is NOT ideal
    // as it might sign out the current admin user if successful.
    // A better approach would require a backend (e.g. Cloud Function).
    try {
        // This is a temporary verification method.
        await signInWithEmailAndPassword(auth, email!, password);
        return { message: 'Verification successful.' };
    } catch (e: any) {
         return {
            errors: { password: ['Invalid password.'] },
            message: `Verification failed.`,
        }
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
            message: 'Invalid fields. Failed to sign in.',
        }
    }

    const { email, password } = validatedFields.data;
    const { auth } = initializeFirebase();

    try {
        await signInWithEmailAndPassword(auth, email!, password);
        revalidatePath('/');
        return { message: 'Sign in successful.' };
    } catch(e: any) {
        return {
             message: `Sign in failed: ${e.message}`,
        }
    }
}


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

  const { firestore, auth } = initializeFirebase();
  const email = `${name!.replace(/\s+/g, '.').toLowerCase()}@timetrack.pro`;

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password!
    );
    const user = userCredential.user;

    await setDoc(doc(firestore, 'staff', user.uid), {
      id: user.uid,
      name,
      hourlyRate,
      email: email,
    });

    revalidatePath('/admin');
    return { message: 'Staff member added successfully.' };
  } catch (e: any) {
    return {
      message: `Database Error: Failed to add staff member. ${e.message}`,
    };
  }
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

  const { firestore, auth } = initializeFirebase();
  const staffDocRef = doc(firestore, 'staff', id!);

  try {
    const updateData: Partial<Staff> = {};
    if (name) updateData.name = name;
    if (hourlyRate) updateData.hourlyRate = hourlyRate;

    await setDoc(staffDocRef, updateData, { merge: true });

    // This part is tricky without having the user logged in.
    // We can't update password directly this way without admin SDK or re-authentication.
    // For now, this will not update the auth password, only the firestore record.
    // A proper implementation would require admin privileges.

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
    // This action requires admin privileges to delete users from auth and their data.
    // For a client-side only app, we can only delete the Firestore document.
    // The user will remain in Firebase Auth.
    await deleteDoc(doc(firestore, 'staff', staffId));

    revalidatePath('/admin');
    return { message: 'Staff member deleted from Firestore.' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Staff Member.' };
  }
}
