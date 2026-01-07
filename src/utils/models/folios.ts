// src/utils/folios.ts

export interface IGetFolio {
  folio_id:           number; // Folio.id
  empresa_id:         number; // Folio.empresa_id (Int)
  libro_contable_id:  number; // Folio.libro_contable_id (Int)
  nombre_libro:       string; // LibroContable.nombre_libro (String)
  folios_disponibles: number; // Folio.folios_disponibles (Int)
  contador_folios:    number; // Folio.contador_folios (Int)
  fecha_habilitacion: Date;   // Folio.fecha_habilitacion (DateTime)
}

export interface IFolioBody {
  nombre_libro:        string;
  folios_disponibles:  number;
  folios_por_habilitar: number; // campo solo de lógica de negocio, OK
  contador_folios:     number;
  empresa_id:          number;
  folio_id:            number;
}

export interface IFolioPutBody {
  folios_used: number;
  folio_id:    number;
}
