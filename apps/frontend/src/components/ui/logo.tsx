import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  priority?: boolean;
  variant?: "default" | "auth";
}

export function Logo({
  className,
  priority = false,
  variant = "default",
}: LogoProps) {
  // Use SVG favicon as logo for all variants
  const logoSrc = "/favicon.svg";
  const textClassName =
    variant === "auth"
      ? "font-normal text-xl text-white"
      : "font-normal text-xl text-foreground";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logoSrc}
        alt="Cortex Logo"
        width={32}
        height={32}
        loading={priority ? "eager" : "lazy"}
        className="h-8 w-auto object-contain"
      />
      <span className={textClassName} style={{ fontFamily: "Arial" }}>
        CORTEX
      </span>
    </div>
  );
}
