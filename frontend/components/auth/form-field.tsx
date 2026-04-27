'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps extends React.ComponentProps<'input'> {
  label: string;
  error?: string;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-[13px] font-medium tracking-wide text-gray-600">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={cn(
            'h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900',
            'placeholder:text-gray-400 outline-none transition-all duration-200',
            'focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15',
            error && 'border-red-400/60 focus:border-red-400/60 focus:ring-red-400/15',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <span className="inline-block size-1 shrink-0 rounded-full bg-red-500" />
            {error}
          </p>
        )}
      </div>
    );
  },
);
FormField.displayName = 'FormField';

export { FormField };
