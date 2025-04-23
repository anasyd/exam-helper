import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Function to format a date in a readable format
export function formatDate(date: Date | null): string {
  if (!date) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium", 
    timeStyle: "short"
  }).format(date);
}

// Function to truncate text to a specific length
export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

// Calculate a score for a flashcard based on performance
export function calculateCardScore(correct: number, incorrect: number): number {
  if (correct === 0 && incorrect === 0) return 0;
  return Math.round((correct / (correct + incorrect)) * 100);
}

// Function to create a delay (for animations, etc.)
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
