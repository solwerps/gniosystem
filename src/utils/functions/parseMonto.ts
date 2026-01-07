// src/utils/functions/parseMonto.ts
export const parseMonto = (value: number) => {
    return value.toLocaleString('es-MX', 
    {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }
    );
};
