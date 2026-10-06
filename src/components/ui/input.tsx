import * as React from 'react';
import { cn } from '@/lib/utils';
export function Input({ className, ...props }: React.ComponentProps<'input'>) { return <input data-slot="input" className={cn('h-11 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/10 disabled:opacity-50', className)} {...props} />; }
