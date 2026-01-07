// src/utils/data/divisas.ts

/**
 * 🔹 Catálogo de divisas usado por GNIO.
 * Los modelos de Prisma (Documento, CuentaBancaria, etc.)
 * usan el campo `moneda: String`, así que este catálogo
 * sirve solo para validación y selección en el frontend.
 */

export interface Divisa {
  moneda: number;        // ID interno (opcional)
  descripcion: string;   // Nombre legible
  key: string;           // Código ISO 4217 (GTQ, USD, etc.)
}

export const divisas: Divisa[] = [
  { moneda: 1, descripcion: "Quetzales", key: "GTQ" },
  { moneda: 2, descripcion: "Dólares de EE.UU.", key: "USD" },
  { moneda: 3, descripcion: "Yenes Japoneses", key: "JPY" },
  { moneda: 4, descripcion: "Francos Belgas", key: "BEF" },
  { moneda: 5, descripcion: "Francos Suizos", key: "CHF" },
  { moneda: 6, descripcion: "Francos Franceses", key: "FRF" },
  { moneda: 7, descripcion: "Dólares Canadienses", key: "CAD" },
  { moneda: 8, descripcion: "Liras Italianas", key: "ITL" },
  { moneda: 9, descripcion: "Libras Esterlinas", key: "GBP" },
  { moneda: 11, descripcion: "Marcos Alemanes", key: "DEM" },
  { moneda: 12, descripcion: "Pesetas Españolas", key: "ESP" },
  { moneda: 13, descripcion: "Chelines Austríacos", key: "ATS" },
  { moneda: 14, descripcion: "Florines Holandeses", key: "NLG" },
  { moneda: 15, descripcion: "Coronas Suecas", key: "SEK" },
  { moneda: 16, descripcion: "Colones Costarricenses", key: "CRC" },
  { moneda: 17, descripcion: "Colones Salvadoreños", key: "SVC" },
  { moneda: 18, descripcion: "Pesos Mexicanos", key: "MXN" },
  { moneda: 19, descripcion: "Lempiras Hondureños", key: "HNL" },
  { moneda: 21, descripcion: "Córdobas Nicaragüenses", key: "NIO" },
  { moneda: 22, descripcion: "Bolívares Venezolanos", key: "VEB" },
  { moneda: 23, descripcion: "Corona Danesa", key: "DKK" },
  { moneda: 24, descripcion: "Euro", key: "EUR" },
  { moneda: 25, descripcion: "Corona Noruega", key: "NOK" },
  { moneda: 26, descripcion: "DEG", key: "XDR" },
  { moneda: 27, descripcion: "Escudo Portugués", key: "PTE" },
  { moneda: 28, descripcion: "Unidad de Cuenta del BID", key: "XUA" },
  { moneda: 29, descripcion: "Peso Argentino", key: "ARS" },
  { moneda: 30, descripcion: "Real Brasileño", key: "BRL" },
  { moneda: 31, descripcion: "Won Coreano", key: "KRW" },
  { moneda: 32, descripcion: "Dólar Hong Kong", key: "HKD" },
  { moneda: 33, descripcion: "Dólar Taiwán", key: "TWD" },
  { moneda: 34, descripcion: "Yuan China", key: "CNY" },
  { moneda: 35, descripcion: "Rupia Pakistán", key: "PKR" },
  { moneda: 36, descripcion: "Rupia India", key: "INR" },
  { moneda: 37, descripcion: "Bolívar Fuerte", key: "VEF" },
  { moneda: 38, descripcion: "Peso Colombiano", key: "COP" },
  { moneda: 39, descripcion: "Peso Dominicano", key: "DOP" },
  { moneda: 40, descripcion: "Ringgit Malasia", key: "MYR" },
  { moneda: 41, descripcion: "Bolívar Soberano", key: "VES" },
  { moneda: 42, descripcion: "Zloty", key: "PLN" }
];
