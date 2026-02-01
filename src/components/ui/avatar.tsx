"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import Image from "next/image";

import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

/**
 * Version optimisée de AvatarImage utilisant next/image
 * pour un meilleur chargement et optimisation des images
 */
interface OptimizedAvatarImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  size?: number;
}

const OptimizedAvatarImage = React.forwardRef<
  HTMLDivElement,
  OptimizedAvatarImageProps
>(({ src, alt, className, size = 40 }, ref) => {
  const [hasError, setHasError] = React.useState(false);
  
  if (!src || hasError) return null;
  
  return (
    <div ref={ref} className={cn("aspect-square h-full w-full relative", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover rounded-full"
        onError={() => setHasError(true)}
      />
    </div>
  );
});
OptimizedAvatarImage.displayName = "OptimizedAvatarImage";

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback, OptimizedAvatarImage };
