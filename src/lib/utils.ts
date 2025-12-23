import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInHours } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateWorkingHours(checkIn: Date, checkOut: Date): number {
  if (!checkIn || !checkOut || checkOut < checkIn) {
    return 0;
  }
  return differenceInHours(checkOut, checkIn);
}
