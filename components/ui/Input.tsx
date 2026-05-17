"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import clsx from "clsx";

export type FieldSize = "sm" | "md" | "lg";

interface BaseFieldProps {
  /** Optional left-side icon. */
  leadingIcon?: ReactNode;
  /** Optional right-side adornment (icon, button, etc). */
  trailingNode?: ReactNode;
  /** Error state — renders red border + focus ring. */
  error?: boolean;
  /** Stretches to container width. */
  fullWidth?: boolean;
  /** Field size. */
  fieldSize?: FieldSize;
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    BaseFieldProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon, trailingNode, error, fullWidth = true, fieldSize = "md", className, ...rest },
  ref,
) {
  if (leadingIcon || trailingNode) {
    return (
      <div className={clsx("relative", fullWidth && "w-full")}>
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          className={clsx(
            "input",
            fieldSize === "sm" && "input-sm",
            fieldSize === "lg" && "input-lg",
            error && "input-error",
            leadingIcon && "pl-11",
            trailingNode && "pr-11",
            className,
          )}
          {...rest}
        />
        {trailingNode && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
            {trailingNode}
          </span>
        )}
      </div>
    );
  }
  return (
    <input
      ref={ref}
      className={clsx(
        "input",
        fieldSize === "sm" && "input-sm",
        fieldSize === "lg" && "input-lg",
        error && "input-error",
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    />
  );
});

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseFieldProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ error, fullWidth = true, className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={clsx(
          "input",
          error && "input-error",
          fullWidth && "w-full",
          className,
        )}
        {...rest}
      />
    );
  },
);

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">,
    BaseFieldProps {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, fullWidth = true, fieldSize = "md", className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={clsx(
        "input appearance-none pr-10 bg-no-repeat",
        fieldSize === "sm" && "input-sm",
        fieldSize === "lg" && "input-lg",
        error && "input-error",
        fullWidth && "w-full",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%239C9690' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundPosition: "right 12px center",
      }}
      {...rest}
    >
      {children}
    </select>
  );
});

/** Form label + helper-text wrapper. Pairs with Input/Textarea/Select. */
export function Field({
  label,
  hint,
  errorMessage,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  errorMessage?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="block text-body-sm font-medium text-neutral-700 mb-1.5">
        {label}
        {required && (
          <span className="text-neutral-500 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {errorMessage ? (
        <p className="mt-1.5 text-body-sm text-error" role="alert">
          {errorMessage}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-body-sm text-neutral-500">{hint}</p>
      ) : null}
    </label>
  );
}
