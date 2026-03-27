import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanObject<T extends object>(obj: T): T {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    const val = (result as any)[key];
    if (val === undefined) {
      delete (result as any)[key];
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      (result as any)[key] = cleanObject(val);
    }
  });
  return result;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 2000
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      
      const errorMsg = error?.message || '';
      const isRateLimit = errorMsg.includes('Rate exceeded') || errorMsg.includes('429') || error?.status === 429;
      const isSpendingCap = errorMsg.includes('spending cap') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('Quota exceeded');
      
      if (isSpendingCap) {
        throw new Error("The shared Gemini API key has exceeded its spending cap/quota. To continue, please provide your own API key in the Settings tab.");
      }

      if (!isRateLimit || attempt >= maxRetries) {
        if (isRateLimit) {
          throw new Error("The AI is currently experiencing high traffic (Rate Limit Exceeded). Please wait a moment and try again.");
        }
        throw error;
      }
      
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt} of ${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error("Max retries exceeded");
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any;
  return function(this: any, ...args: Parameters<T>) {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, lastArgs);
    }, delay);
  } as T;
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number) {
  let inThrottle = false;
  let lastArgs: any;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn.apply(this, lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  } as T;
}
