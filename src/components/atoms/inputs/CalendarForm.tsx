// src/components/atoms/inputs/CalendarForm.tsx
'use client';

import React from 'react';
import clsx from 'clsx';

interface CalendarProps {
  label: string;
  classNameContainer?: string;
  errorMessage?: string;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  /** Valor actual: normalmente Date o null */
  value?: Date | null;
  /** onChange original de Flatpickr: devolvemos un arreglo de Date para no romper usos existentes */
  onChange?: (dates: Date[]) => void;
}

export const CalendarForm: React.FC<CalendarProps> = ({
  label,
  classNameContainer,
  disabled,
  errorMessage,
  placeholder,
  name,
  value,
  onChange,
}) => {
  const showError = Boolean(errorMessage && errorMessage !== 'success');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value; // formato YYYY-MM-DD

    if (!inputValue) {
      // Mantener firma: si no hay fecha, mandamos arreglo vacío
      onChange?.([]);
      return;
    }

    const selectedDate = new Date(inputValue);
    onChange?.([selectedDate]);
  };

  // Normalizamos el value para el input type="date"
  const inputValue =
    value instanceof Date ? value.toISOString().slice(0, 10) : '';

  return (
    <div className={clsx('', classNameContainer)}>
      <label
        className={clsx(
          'font-semibold text-sm text-gray-600 pb-1 block mb-2.5',
        )}
      >
        {label}
      </label>

      <input
        type="date"
        name={name}
        value={inputValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className="border rounded-lg px-3 py-2.5 text-sm w-full bg-white"
      />

      <div
        className={clsx(
          'transition-opacity duration-300 ease-in-out mt-2',
          showError ? 'opacity-100 h-6' : 'opacity-0 h-0',
        )}
      >
        <span className={clsx('text-sm text-red-500', 'block')}>
          {errorMessage}
        </span>
      </div>
    </div>
  );
};
