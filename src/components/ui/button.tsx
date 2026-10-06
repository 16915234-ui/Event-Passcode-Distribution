import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const buttonVariants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 shrink-0', {
  variants: { variant: { default: 'bg-primary text-white hover:bg-primary/90 shadow-sm', outline: 'border border-border bg-white hover:bg-muted text-foreground', ghost: 'hover:bg-muted text-muted-foreground' }, size: { default: 'h-11 px-5', sm: 'h-9 px-3', icon: 'size-11' } }, defaultVariants: { variant: 'default', size: 'default' },
});
export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'; return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
