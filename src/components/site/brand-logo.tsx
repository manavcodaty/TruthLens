import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function BrandLogo({
  className,
  imageClassName,
  priority = false,
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-block h-9 shrink-0 overflow-hidden align-middle [aspect-ratio:315/303]",
        className
      )}
    >
      <Image
        src="/TruthLens.png"
        alt="TruthLens logo"
        width={315}
        height={303}
        priority={priority}
        className={cn("block h-full w-full object-cover", imageClassName)}
      />
    </span>
  );
}
