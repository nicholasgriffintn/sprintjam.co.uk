import type { HTMLAttributes, ReactNode } from "react";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";

import { cn } from "@/lib/cn";

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  src?: string;
  alt?: string;
  fallback?: ReactNode;
  fallbackDelay?: number;
  imageClassName?: string;
  fallbackClassName?: string;
}

export const Avatar = ({
  src,
  alt,
  fallback,
  fallbackDelay,
  className,
  imageClassName,
  fallbackClassName,
  ...props
}: AvatarProps) => {
  return (
    <BaseAvatar.Root
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-full select-none",
        className,
      )}
      {...props}
    >
      {src ? (
        <BaseAvatar.Image
          src={src}
          alt={alt}
          className={cn("size-full object-cover", imageClassName)}
        />
      ) : null}
      <BaseAvatar.Fallback
        delay={fallbackDelay}
        className={cn("flex size-full items-center justify-center", fallbackClassName)}
      >
        {fallback}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
};
