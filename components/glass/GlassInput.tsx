import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

export const GlassInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => {
    return <input ref={ref} className={clsx("glass-input", className)} {...rest} />;
  },
);
GlassInput.displayName = "GlassInput";

export const GlassTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => {
    return <textarea ref={ref} className={clsx("glass-input resize-y", className)} {...rest} />;
  },
);
GlassTextarea.displayName = "GlassTextarea";

export const GlassSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => {
    return (
      <select ref={ref} className={clsx("glass-input pr-8 appearance-none", className)} {...rest}>
        {children}
      </select>
    );
  },
);
GlassSelect.displayName = "GlassSelect";
