import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInMinutes } from 'date-fns';

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
