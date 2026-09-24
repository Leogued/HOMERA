import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "gold" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-homera-blue text-white hover:bg-homera-blue-light dark:bg-homera-blue-light dark:hover:bg-homera-blue",
  gold:
    "bg-homera-gold text-white hover:bg-homera-gold-light dark:bg-homera-gold dark:hover:bg-homera-gold-light",
  outline:
    "border border-border bg-transparent text-foreground hover:border-homera-blue hover:text-homera-blue dark:hover:border-homera-gold dark:hover:text-homera-gold",
  ghost:
    "bg-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/5",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        rounded-lg
        font-medium
        transition-all duration-200
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-homera-gold
        disabled:pointer-events-none
        disabled:opacity-50
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    />
  );
}
