import React, { useId } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = '',
      containerClassName = '',
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}-${generatedId}` : generatedId);
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`flex flex-col gap-1.5 w-full text-right ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold text-text-1 select-none flex items-center justify-between"
          >
            <span>{label}</span>
            {required && <span className="text-danger text-xs font-black mr-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none flex items-center" aria-hidden="true">
              {rightIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`w-full bg-surface-1 text-text-1 placeholder:text-text-3 text-sm font-medium rounded-[10px] border transition-all duration-150 py-2.5 px-3.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
              rightIcon ? 'pr-9' : ''
            } ${leftIcon ? 'pl-9' : ''} ${
              error
                ? 'border-danger focus:ring-2 focus:ring-danger/20'
                : 'border-border-default hover:border-border-strong focus:border-brand focus:ring-2 focus:ring-brand/20'
            } ${className}`}
            {...props}
          />

          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none flex items-center" aria-hidden="true">
              {leftIcon}
            </div>
          )}
        </div>

        {error ? (
          <p id={errorId} role="alert" className="text-[11px] text-danger font-medium flex items-center gap-1 mt-0.5 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-[11px] text-text-3 font-normal mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      children,
      className = '',
      containerClassName = '',
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}-${generatedId}` : generatedId);
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`flex flex-col gap-1.5 w-full text-right ${containerClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-bold text-text-1 select-none flex items-center justify-between"
          >
            <span>{label}</span>
            {required && <span className="text-danger text-xs font-black mr-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            required={required}
            aria-required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`w-full bg-surface-1 text-text-1 text-sm font-medium rounded-[10px] border appearance-none transition-all duration-150 py-2.5 pr-3.5 pl-9 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              error
                ? 'border-danger focus:ring-2 focus:ring-danger/20'
                : 'border-border-default hover:border-border-strong focus:border-brand focus:ring-2 focus:ring-brand/20'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-surface-1 text-text-1">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none flex items-center" aria-hidden="true">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error ? (
          <p id={errorId} role="alert" className="text-[11px] text-danger font-medium flex items-center gap-1 mt-0.5 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-[11px] text-text-3 font-normal mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      className = '',
      containerClassName = '',
      id,
      disabled,
      required,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}-${generatedId}` : generatedId);
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`flex flex-col gap-1.5 w-full text-right ${containerClassName}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-bold text-text-1 select-none flex items-center justify-between"
          >
            <span>{label}</span>
            {required && <span className="text-danger text-xs font-black mr-1" aria-hidden="true">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full bg-surface-1 text-text-1 placeholder:text-text-3 text-sm font-medium rounded-[10px] border transition-all duration-150 p-3 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-y ${
            error
              ? 'border-danger focus:ring-2 focus:ring-danger/20'
              : 'border-border-default hover:border-border-strong focus:border-brand focus:ring-2 focus:ring-brand/20'
          } ${className}`}
          {...props}
        />

        {error ? (
          <p id={errorId} role="alert" className="text-[11px] text-danger font-medium flex items-center gap-1 mt-0.5 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-[11px] text-text-3 font-normal mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
