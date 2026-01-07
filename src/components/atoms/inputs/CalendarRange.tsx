// src/components/atoms/inputs/CalendarRange.tsx
"use client";

import "flatpickr/dist/themes/material_green.css";
import { Spanish } from "flatpickr/dist/l10n/es.js";

import Flatpickr from "react-flatpickr";
import React from "react";
import clsx from "clsx";

interface CalendarProps {
  dates: Date[];
  setDates: React.Dispatch<React.SetStateAction<Date[]>>;
  label: string;
  classNameContainer?: string;
  errorMessage?: string;
  disabled?: boolean;
  placeholder?: string;
  customDisableDates?: (date: Date) => boolean;
}

export const CalendarRange: React.FC<CalendarProps> = ({
  dates,
  setDates,
  label,
  classNameContainer,
  disabled,
  errorMessage,
  placeholder = "Selecciona un rango de fecha",
  customDisableDates,
}) => {
  const showError = Boolean(errorMessage && errorMessage !== "success");

  const handleDateChange = (selectedDates: Date[]) => {
    setDates(selectedDates);
  };

  // Igual que en Conta Cox: solo permitir fechas del mismo año del primer día
  const defaultDisableDates = (date: Date) => {
    if (dates.length > 0 && dates[0] instanceof Date) {
      const selectedYear = dates[0].getFullYear();
      return date.getFullYear() !== selectedYear;
    }
    return false;
  };

  // Si te pasan una función custom, la usamos; si no, usamos la default.
  // (tu código anterior hacía corto circuito raro con el ternario)
  const disableDates = (date: Date) => {
    if (customDisableDates) return customDisableDates(date);
    return defaultDisableDates(date);
  };

  return (
    <div className={clsx("", classNameContainer)}>
      <label className="font-semibold text-sm text-gray-600 pb-1 block mb-2.5">
        {label}
      </label>

      <Flatpickr
        value={dates}
        onChange={handleDateChange}
        options={{
          // Formato que vas a enviar a la API si conviertes luego a ISO/YMD
          dateFormat: "Y-m-d",
          // Formato “bonito” que ve el usuario
          altInput: true,
          altFormat: "j F, Y",
          mode: "range",
          disable: [disableDates],
          locale: {
            ...Spanish,
            rangeSeparator: " hasta ",
          },
        }}
        disabled={disabled}
        className="border rounded-lg px-3 py-2.5 text-sm w-full bg-white"
        placeholder={placeholder}
      />

      <div
        className={clsx(
          "transition-opacity duration-300 ease-in-out mt-2",
          showError ? "opacity-100 h-6" : "opacity-0 h-0"
        )}
      >
        <span className={clsx("text-sm text-red-500", "block")}>
          {errorMessage}
        </span>
      </div>
    </div>
  );
};
