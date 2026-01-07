// src/utils/services/retenciones.ts
import type { IUploadRetencionISR, IUploadRetencionIVA} from '..';
import { fetchService } from '..';

export const obtenerRetencionesIVA = async (empresa_id: number, date: string | null = null) => {
    return await fetchService({
       url: `/api/retenciones/iva?empresa_id=${empresa_id}&fecha=${date}`,
        method: 'GET'
    });
};

export const crearRetencionesIVA = async (
    retenciones: IUploadRetencionIVA[],
    empresa_id: number,
    date: Date
    ) => {
        return await fetchService({
        url: `/api/retenciones/iva/masivo`,
        method: 'POST',
        body: JSON.stringify({ retenciones, empresa_id, date })
    });
};

export const obtenerRetencionesISR = async (empresa_id: number, date: string | null = null) => {
    return await fetchService({
        url: `/api/retenciones/isr?empresa_id=${empresa_id}&fecha=${date}`,
        method: 'GET'
    });
};

export const crearRetencionesISR = async (
    retenciones: IUploadRetencionISR[],
    empresa_id: number,
    date: Date
    ) => {
        return await fetchService({
        url: `/api/retenciones/isr/masivo`,
        method: 'POST',
        body: JSON.stringify({ retenciones, empresa_id, date })
    });
};
