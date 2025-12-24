import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInMinutes } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateWorkingHours(checkIn?: Date, checkOut?: Date): number {
  if (!checkIn || !checkOut) return 0;
  
  if (checkOut < checkIn) {
    return 0;
  }
  const diffMinutes = differenceInMinutes(checkOut, checkIn);
  return diffMinutes / 60;
}

export function toDate(timestamp: Date | Timestamp | undefined): Date | undefined {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return timestamp.toDate();
}
