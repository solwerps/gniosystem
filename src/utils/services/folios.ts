//src/utils/services/folios.ts
import { fetchService } from '../functions';
import type { IFolioBody} from '../models';


export const obtenerFoliosByNit = async (
    nit: string,
    tenant?: string,
    empresaId?: number
) => {
    const params = new URLSearchParams();
    params.set("nit", nit);
    if (tenant) params.set("tenant", tenant);
    if (empresaId) params.set("empresa_id", String(empresaId));
    return await fetchService({
        url: `/api/folios?${params.toString()}`,
        method: 'GET'
    });
};

export const actualizarFoliosHabilitados = async (
    body: IFolioBody,
    tenant?: string
) => {
    return await fetchService({
        url: `/api/folios`,
        method: 'POST',
        body: JSON.stringify({ ...body, tenant })
    });
};

export const reiniciarContadorFolios = async (
    body: IFolioBody,
    tenant?: string
) => {
    return await fetchService({
        url: `/api/folios`,
        method: 'PUT',
        body: JSON.stringify({ ...body, tenant })
    });
};

export const obtenerFolioByLibro = async (
    libro_id: number,
    empresa_id: number,
    tenant?: string
) => {
    const params = new URLSearchParams();
    params.set("libro_id", String(libro_id));
    params.set("empresa_id", String(empresa_id));
    if (tenant) params.set("tenant", tenant);

    return await fetchService({
        url: `/api/folios/libro?${params.toString()}`,
        method: 'GET'
    });
};

export const updateContadorFolios = async (
    folio_id: number,
    folios_used: number,
    tenant?: string,
    empresa_id?: number
) => {
    return await fetchService({
        url: `/api/folios/libro`,
        method: 'PUT',
        body: JSON.stringify({
            folio_id,
            folios_used,
            tenant,
            empresa_id
        })
    });
};
