// src/utils/functions/formatDate.ts
export const formatDate = (fecha: string): string | null => {
    // Parsear la fecha de emisión
    const parts = fecha.split('/');
    if (parts.length !== 3) {
        console.error('Formato de fecha de emisión inválido:', fecha);
        return null;
    }
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Los meses en JavaScript van de 0 a 11
    const year = parseInt(parts[2]);

    // Crear un objeto de fecha con los componentes parseados
    const fechaEmisionDate = new Date(year, month, day);

    // Verificar si la fecha es válida
    if (isNaN(fechaEmisionDate.getTime())) {
        console.error('Fecha de emisión inválida:', fecha);
        return null;
    }

    // Formatear la fecha como ISO
    return fechaEmisionDate.toISOString().split('T')[0];
};
