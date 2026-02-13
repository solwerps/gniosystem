// src/utils/services/retenciones.ts
import type { IUploadRetencionISR, IUploadRetencionIVA} from '..';
import { fetchService } from '..';

export const obtenerRetencionesIVA = async (
    empresa_id: number,
    date: string | null = null,
    tenant?: string
) => {
    const params = new URLSearchParams();
    params.set("empresa_id", String(empresa_id));
    if (date != null) params.set("fecha", String(date));
    if (tenant) params.set("tenant", tenant);
    return await fetchService({
       url: `/api/retenciones/iva?${params.toString()}`,
        method: 'GET'
    });
};

export const crearRetencionesIVA = async (
    retenciones: IUploadRetencionIVA[],
    empresa_id: number,
    date: Date,
    tenant?: string
    ) => {
        return await fetchService({
        url: `/api/retenciones/iva/masivo`,
        method: 'POST',
        body: JSON.stringify({ retenciones, empresa_id, date, tenant })
    });
};

export const obtenerRetencionesISR = async (
    empresa_id: number,
    date: string | null = null,
    tenant?: string
) => {
    const params = new URLSearchParams();
    params.set("empresa_id", String(empresa_id));
    if (date != null) params.set("fecha", String(date));
    if (tenant) params.set("tenant", tenant);
    return await fetchService({
        url: `/api/retenciones/isr?${params.toString()}`,
        method: 'GET'
    });
};

export const crearRetencionesISR = async (
    retenciones: IUploadRetencionISR[],
    empresa_id: number,
    date: Date,
    tenant?: string
    ) => {
        return await fetchService({
        url: `/api/retenciones/isr/masivo`,
        method: 'POST',
        body: JSON.stringify({ retenciones, empresa_id, date, tenant })
    });
};
