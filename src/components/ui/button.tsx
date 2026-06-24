import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Chiseled Editorial button system — site-wide.
 * Radius 6px (4px for segmented inner items via .btn-seg-item).
 * Heights: sm = 32, default = 40, lg = 44, icon = 40x40.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Cream → ink. Primary call to action.
        default:
          "bg-cream text-ink font-bold hover:bg-cream-bright shadow-sm",
        primary:
          "bg-cream text-ink font-bold hover:bg-cream-bright shadow-sm",
        // Bordered ghost on dark surfaces.
        secondary:
          "border border-cream/20 bg-transparent text-cream hover:bg-cream/5 hover:border-cream/40",
        outline:
          "border border-cream/20 bg-transparent text-cream hover:bg-cream/5 hover:border-cream/40",
        // Tinted destructive (red).
        destructive:
          "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300",
        // Amber outline for premium / accent contexts.
        amber:
          "border border-amber/40 text-amber-bright bg-transparent hover:bg-amber/10",
        // Filled amber — reserved for hero trial CTA.
        amberSolid:
          "bg-amber text-ink font-bold hover:bg-amber-bright shadow-sm",
        // Transparent.
        ghost:
          "bg-transparent text-cream hover:bg-cream/5",
        link:
          "text-amber underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 text-sm",
        sm: "h-8 px-4 text-xs",
        lg: "h-11 px-8 text-sm",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
