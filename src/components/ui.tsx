import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactElement,
  type LabelHTMLAttributes,
} from "react";
import { Link } from "@/i18n/navigation";
import { Loader2, type LucideIcon } from "lucide-react";
import { cx } from "@/components/cx";
import { Dropdown } from "@/components/Dropdown";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const buttonVariants = {
  primary: "bg-brand text-brand-contrast hover:bg-brand-strong shadow-sm",
  secondary:
    "bg-surface-2 text-text-primary hover:bg-border-strong/40 border border-border",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-2",
  danger: "bg-status-critical text-white hover:opacity-90",
  outline: "border border-border text-text-primary hover:bg-surface-2",
};

const buttonSizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4",
  lg: "h-12 px-6 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  /** Shows a spinner and disables the button — for an in-flight submit/action. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", loading = false, disabled, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cx(
          buttonBase,
          buttonVariants[variant],
          buttonSizes[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={2} />}
        {children}
      </button>
    );
  },
);

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        buttonBase,
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cx(
        "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cx(
        "min-h-24 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20",
        className,
      )}
      {...props}
    />
  );
});

export const Select = Dropdown;

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cx("text-[13px] font-medium text-text-secondary", className)}
      {...props}
    />
  );
}

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children?: string;
}) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[12.5px] text-status-critical">
      {children}
    </p>
  );
}

export function Field({
  label,
  error,
  children,
  htmlFor,
}: {
  label: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  const control =
    isValidElement(children) && error
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          "aria-invalid": true,
          "aria-describedby": errorId,
        })
      : children;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {control}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx("rounded-lg border border-border bg-surface", className)}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
}

const badgeVariants = {
  neutral: "bg-surface-2 text-text-secondary",
  good: "bg-status-good-soft text-status-good",
  critical: "bg-status-critical-soft text-status-critical",
  brand: "bg-brand-soft text-brand",
};

export function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: keyof typeof badgeVariants;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium",
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && (
        <p className="max-w-sm text-[13px] text-text-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { cx };
