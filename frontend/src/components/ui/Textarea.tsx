import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <textarea
        ref={ref}
        className={cn(
          'w-full px-3 py-2 bg-bg-elevated border rounded-lg text-text-primary placeholder-text-muted',
          'border-border-strong focus:border-accent focus:ring-1 focus:ring-accent',
          'transition-colors duration-150 resize-y min-h-[80px]',
          error && 'border-error focus:border-error focus:ring-error',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-error" role="alert">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';