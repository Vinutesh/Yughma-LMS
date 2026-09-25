import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[color,background-color,border-color,transform,box-shadow] duration-120 ease-out hover:scale-[1.01] active:scale-[0.98] active:duration-80 disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // The default variant — Log in, Save, every primary action across
        // the app (44+ call sites, unlike `accent` below which barely gets
        // used) — so this is the one gradient surface in the whole
        // component set; see globals.css's --brand-gradient comment on why
        // it's spent here and nowhere else. `brightness` on hover, not
        // `opacity`: opacity would wash the gradient out toward the page
        // background instead of just brightening it.
        primary: "bg-brand-gradient text-accent-fg shadow-(--shadow-token-glow) hover:brightness-110",
        accent: "bg-accent text-accent-fg hover:opacity-90",
        secondary:
          "bg-surface-alt text-text-primary border border-border hover:bg-border/40",
        ghost: "text-text-secondary hover:bg-surface-alt hover:text-text-primary",
        destructive: "bg-danger text-white hover:opacity-90",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-5 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading, disabled, children, ...props },
    ref,
  ) => {
    // Slot requires exactly one child, and `disabled` isn't valid on the
    // anchors/links asChild is used for — so styling passes through and the
    // spinner/disabled handling stays on the real <button> path only.
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span
            className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
