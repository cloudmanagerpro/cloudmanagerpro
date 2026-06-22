import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[60%] w-[60%]"
        aria-hidden="true"
      >
        <path
          d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z"
          fill="currentColor"
          fillOpacity="0.95"
        />
        <path
          d="m3 12 9 4.5 9-4.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
        <path
          d="m3 16.5 9 4.5 9-4.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
      </svg>
    </span>
  );
}

export function Logo({ className, showText = true, textClassName }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className="h-8 w-8" />
      {showText && (
        <span
          className={cn(
            "text-[15px] font-semibold tracking-tight",
            textClassName,
          )}
        >
          CloudManager<span className="text-primary">Pro</span>
        </span>
      )}
    </span>
  );
}
