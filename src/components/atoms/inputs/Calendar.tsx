// src/components/atoms/inputs/Calendar.tsx
'use client';

import React from 'react';
import clsx from 'clsx';

interface CalendarProps {
  date: Date;
  setDate: React.Dispatch<React.SetStateAction<Date>>;
  label: string;
  classNameContainer?: string;
  errorMessage?: string;
  disabled?: boolean;
  placeholder?: string; // se mantiene por compatibilidad, aunque el input date casi no lo usa
}

export const Calendar: React.FC<CalendarProps> = ({
  date,
  setDate,
  label,
  classNameContainer,
  disabled,
  errorMessage,
  placeholder,
}) => {
  const showError = Boolean(errorMessage && errorMessage !== 'success');

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value; // formato YYYY-MM-DD
    if (!value) return;
    setDate(new Date(value));
  };

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
        value={date.toISOString().slice(0, 10)} // YYYY-MM-DD
        onChange={handleDateChange}
        disabled={disabled}
        className="border rounded-lg px-3 py-2.5 text-sm w-full bg-white"
        placeholder={placeholder}
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
