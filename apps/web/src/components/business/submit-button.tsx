'use client';

import { useFormStatus } from 'react-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: ReactNode;
};

export function SubmitButton({ children, pendingLabel, className = 'btn primary', disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const content = pending ? pendingLabel ?? children : children;

  return (
    <button
      {...props}
      className={className}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      aria-busy={pending || undefined}
      type={props.type ?? 'submit'}
    >
      {content}
    </button>
  );
}
