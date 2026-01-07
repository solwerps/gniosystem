//src/utils/services/folios.ts
import { fetchService } from '../functions';
import type { IFolioBody} from '../models';


export const obtenerFoliosByNit = async (nit: string) => {
    return await fetchService({
        url: `/api/folios?nit=${nit}`,
        method: 'GET'
    });
};

export const actualizarFoliosHabilitados = async (body: IFolioBody) => {
    return await fetchService({
        url: `/api/folios`,
        method: 'POST',
        body: JSON.stringify(body)
    });
};

export const reiniciarContadorFolios = async (body: IFolioBody) => {
    return await fetchService({
        url: `/api/folios`,
        method: 'PUT',
        body: JSON.stringify(body)
    });
};

export const obtenerFolioByLibro = async (libro_id: number, empresa_id: number) => {
    return await fetchService({
        url: `/api/folios/libro?libro_id=${libro_id}&empresa_id=${empresa_id}`,
        method: 'GET'
    });
};

export const updateContadorFolios = async (folio_id: number, folios_used: number) => {
    return await fetchService({
        url: `/api/folios/libro`,
        method: 'PUT',
        body: JSON.stringify({
            folio_id,
            folios_used
        })
    });
};