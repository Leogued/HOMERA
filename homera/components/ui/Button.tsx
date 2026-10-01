import type { ButtonHTMLAttributes, Ref } from "react";

type ButtonVariant = "primary" | "accent" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-homera-brown text-white hover:bg-homera-brown-light dark:bg-homera-brown-light dark:hover:bg-homera-brown",
  accent:
    "homera-accent-button text-white",
  outline:
    "border border-border bg-transparent text-foreground hover:border-homera-brown hover:text-homera-brown dark:hover:border-homera-terracotta dark:hover:text-homera-terracotta",
  ghost:
    "bg-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/5",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-[12.5px]",
  md: "px-5 py-2.5 text-[13px]",
  lg: "px-6 py-3 text-sm",
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
        homera-press
        inline-flex items-center justify-center
        rounded-lg
        font-medium
        tracking-[0.01em]
        transition-all duration-200
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-homera-terracotta
        focus-visible:ring-offset-2
        focus-visible:ring-offset-background
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
