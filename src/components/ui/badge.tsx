import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.22em]", {
  variants: {
    variant: {
      default: "border-transparent bg-primary/10 text-primary",
      secondary: "border-transparent bg-secondary text-secondary-foreground",
      outline: "border-border bg-transparent text-foreground",
      live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      upcoming: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
      completed: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
