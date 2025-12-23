import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInHours } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const toDate = (date: Date | Timestamp) => (date instanceof Timestamp ? date.toDate() : date);

export function calculateWorkingHours(checkIn: Date | Timestamp, checkOut: Date | Timestamp): number {
  const checkInDate = toDate(checkIn);
  const checkOutDate = toDate(checkOut);
  if (!checkInDate || !checkOutDate || checkOutDate < checkInDate) {
    return 0;
  }
  return differenceInHours(checkOutDate, checkInDate);
}
