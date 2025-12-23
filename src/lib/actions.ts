'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  getFirestore,
  doc,
  collection,
  writeBatch,
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

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
    .min(6, { message: 'Password must be at least 6 characters.' })
    .optional(),
  email: z.string().email({ message: 'Please enter a valid email.' }).optional(),
  date: z.string().optional(),
});

const VerifyPasswordSchema = z.object({
  password: z.string().min(1, { message: 'Password is required.' }),
  email: z.string().email({ message: 'User email is required for verification.'}),
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

// This function is for server-side auth actions.
// It initializes a temporary admin app to perform user creation.
async function getAdminAuth() {
  // In a real production scenario, you would use the Firebase Admin SDK
  // with service account credentials. For this environment, we'll use the
  // client SDK with the understanding that this is a simplified setup.
  const { auth } = initializeFirebase();
  return auth;
}

export async function addStaff(prevState: State, formData: FormData) {
  const AddStaffSchema = FormSchema.pick({ name: true, hourlyRate: true, email: true, password: true });
  const validatedFields = AddStaffSchema.safeParse({
    name: formData.get('name'),
    hourlyRate: formData.get('hourlyRate'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to add staff. Please check the fields.',
    };
  }

  const { name, hourlyRate, email, password } = validatedFields.data;

  try {
    const { firestore } = initializeFirebase();
    const auth = await getAdminAuth();

    // We can't create a user and a firestore doc in a transaction,
    // so we'll create the user first, then the doc.
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    const newStaffRef = doc(firestore, 'staff', userId);
    await setDoc(newStaffRef, {
        id: userId,
        name: name,
        hourlyRate: hourlyRate,
        email: email,
    });

    revalidatePath('/admin');
    return { message: 'Staff member added successfully.' };
  } catch (error: any) {
    let errorMessage = 'Failed to add staff member.';
     if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already in use. Please use a different email.';
    } else if (error.code) {
        errorMessage = error.message;
    }
    return { message: errorMessage, errors: {} };
  }
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

  const { id, name, hourlyRate } = validatedFields.data;

  if (!id) {
    return { message: 'Staff ID is missing.' };
  }

  try {
    const { firestore } = initializeFirebase();
    const staffRef = doc(firestore, 'staff', id);
    await updateDoc(staffRef, { name, hourlyRate });
    revalidatePath('/admin');
    return { message: 'Staff member updated successfully.' };
  } catch (e) {
    return { message: 'Database Error: Failed to update staff member.' };
  }
}

export async function deleteStaff(staffId: string) {
    if (!staffId) {
        return { message: 'Staff ID is required.' };
    }
  try {
    const { firestore } = initializeFirebase();
    // In a real app, you would also delete the user from Firebase Auth,
    // which requires the Admin SDK. For now, we only delete the Firestore doc.
    await deleteDoc(doc(firestore, 'staff', staffId));
    revalidatePath('/admin');
    return { message: 'Staff member deleted.' };
  } catch (e) {
    return { message: 'Database Error: Failed to delete staff member.' };
  }
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

  const { staffId, amount, date } = validatedFields.data;

  try {
    const { firestore } = initializeFirebase();
    const advanceCollection = collection(firestore, 'advance_payments');
    await addDoc(advanceCollection, {
        staffId,
        amount,
        date: new Date(date as string),
    });

    revalidatePath('/advance');
    return { message: 'Advance payment added successfully.' };
  } catch (e) {
    return { message: 'Database Error: Failed to add advance payment.' };
  }
}

export async function upsertAttendance(staffId: string, recordDate: Date, field: string, time: string) {
    try {
        const { firestore } = initializeFirebase();
        
        const [hours, minutes] = time.split(':');
        const newDateTime = new Date(recordDate);
        newDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        const attendanceCol = collection(firestore, `attendance`);
        const q = query(attendanceCol, where("staffId", "==", staffId), where("recordDate", "==", recordDate));
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // Create new record
            const newRecordRef = doc(collection(firestore, 'attendance'));
            await setDoc(newRecordRef, {
                staffId: staffId,
                recordDate: recordDate,
                [field]: newDateTime,
            });
        } else {
            // Update existing record
            const recordDoc = querySnapshot.docs[0];
            await updateDoc(recordDoc.ref, {
                [field]: newDateTime,
            });
        }
        
        revalidatePath('/');
        return { success: true, message: 'Attendance updated.' };
    } catch (error) {
        return { success: false, message: 'Failed to update attendance.' };
    }
}

export async function verifyStaffPassword(prevState: State, formData: FormData) {
  const validatedFields = VerifyPasswordSchema.safeParse({
    password: formData.get('password'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Email and password are required for verification.',
    };
  }
  const { password, email } = validatedFields.data;

  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user || user.email !== email) {
      // This case should ideally not happen if the correct email is passed
      return { message: 'Authentication session error. Please sign in again.' };
    }

    const credential = EmailAuthProvider.credential(user.email, password);
    // Re-authenticate the user to verify their password
    await reauthenticateWithCredential(user, credential);
    
    return { message: 'Verification successful.' };
  } catch (error: any) {
    let errorMessage = 'An unknown error occurred during verification.';
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMessage = 'The password you entered is incorrect. Please try again.';
    } else {
        errorMessage = 'Verification failed. Please try again later.';
    }
    return { message: errorMessage, errors: { password: [errorMessage] } };
  }
}