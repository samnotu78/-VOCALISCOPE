import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'sonar';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-bg-elevated text-text-primary border-border',
    secondary: 'bg-bg-surface text-text-secondary border-border',
    outline: 'bg-transparent text-text-secondary border-border',
    sonar: 'bg-cyan-sonar/10 text-cyan-sonar border-cyan-sonar/30',
  }[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none',
        variantStyles,
        className
      )}
      {...props}
    />
  );
}
