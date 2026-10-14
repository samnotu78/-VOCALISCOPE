import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(decimals);
}

export function formatFrequency(hz: number | null | undefined): string {
  if (hz === null || hz === undefined || Number.isNaN(hz)) {
    return '—';
  }
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(2)} kHz`;
  }
  return `${hz.toFixed(1)} Hz`;
}

export function formatDifference(value: number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
}

export function getDifferenceColor(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'text-muted-foreground';
  }
  if (value > 0) return 'text-accent';
  if (value < 0) return 'text-warning';
  return 'text-muted-foreground';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}