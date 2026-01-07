// src/utils/functions/parseDate.ts
export const parseDate = (date: string) => {
  // date puede venir como "2025-01-01T00:00:00.000Z"
  const iso = date.slice(0, 10); // "2025-01-01"
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`; // "01/01/2025"
};