// src/components/FormFields.tsx
"use client";

import { ReactNode } from "react";

// ═══════════════════════════════════════════
// Field wrapper with label
// ═══════════════════════════════════════════

export function Field({
  label,
  required,
  children,
  error,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════
// Select dropdown
// ═══════════════════════════════════════════

export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none disabled:opacity-50 disabled:bg-gray-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ═══════════════════════════════════════════
// Text Input
// ═══════════════════════════════════════════

export function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  step,
  disabled,
}: {
  value: string | number;
  onChange: (val: string) => void;
  type?: "text" | "number" | "date" | "time";
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none disabled:opacity-50 disabled:bg-gray-50"
    />
  );
}

// ═══════════════════════════════════════════
// Toggle switch
// ═══════════════════════════════════════════

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-teal-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
      <div>
        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
          {label}
        </span>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

// ═══════════════════════════════════════════
// Pill selector (single)
// ═══════════════════════════════════════════

export function PillSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// Textarea
// ═══════════════════════════════════════════

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none resize-none"
    />
  );
}
