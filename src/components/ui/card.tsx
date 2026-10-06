import * as React from 'react';
import { cn } from '@/lib/utils';
export function Card({ className, ...props }: React.ComponentProps<'section'>) { return <section data-slot="card" className={cn('rounded-2xl border border-border bg-card p-6 shadow-[0_2px_10px_#20130803]', className)} {...props} />; }
