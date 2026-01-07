// src/components/atoms/inputs/CalendarMonth.tsx
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
}

export const CalendarMonth: React.FC<CalendarProps> = ({
  date,
  setDate,
  label,
  classNameContainer,
  disabled,
  errorMessage,
}) => {
  const showError = Boolean(errorMessage && errorMessage !== 'success');

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDate(new Date(event.target.value));
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
        type="month"
        value={date.toISOString().slice(0, 7)} // Formato YYYY-MM
        onChange={handleDateChange}
        disabled={disabled}
        className="border rounded-lg px-3 py-2.5 text-sm w-full bg-transparent bg-white"
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
