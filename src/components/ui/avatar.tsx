import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: AvatarPrimitive.AvatarProps) {
  return <AvatarPrimitive.Root className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props} />;
}

function AvatarImage({ className, ...props }: AvatarPrimitive.AvatarImageProps) {
  return <AvatarPrimitive.Image className={cn("aspect-square h-full w-full object-cover", className)} {...props} />;
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.AvatarFallbackProps) {
  return <AvatarPrimitive.Fallback className={cn("flex h-full w-full items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground", className)} {...props} />;
}

export { Avatar, AvatarFallback, AvatarImage };
