// src/utils/models/empresa.ts

export interface IEmpresaForm {
  id?: number;
  nombre_empresa: string;
  razon_social: "Individual" | "Juridico"; // enum RazonSocial en Prisma
  nit: string;
  dpi?: string;
  sector: string;
  actividad_economica: string;
  direccion: string;
  correo: string;
  correo_notificaciones?: string;
  correo_adicional?: string;
  estado?: number;
  fecha_constitucion: Date;
  fecha_inscripcion: Date;
  tipo_personeria: string;
  nomenclatura_id: number;
  regimen_id: number;
  // establecimientos?: IEstablecimiento[];
  // contador?: IContador;
  // representante?: IRepresentante;
}

export interface IEstablecimientoForm {
  nombre: string;
  numero_de_establecimiento: string;
  direccion_comercial?: string;
  fecha_de_inicio_de_operaciones: string; // en formulario suele ir como string
  tipo_de_establecimiento: string;
  clasificacion_por_establecimiento: string;
  actividad_economica: string;
  nit: string;
}

export interface IEmpresa {
  id: number;
  nombre_empresa: string;
  razon_social: "Individual" | "Juridico"; // enum RazonSocial en Prisma
  nit: string;
  dpi: string;
  tipo_personeria: string;
  fecha_constitucion: string;
  fecha_inscripcion: string;
  sector: string;
  actividad_economica: string;
  direccion_fiscal: string;
  correo_principal: string;
  correo_notificaciones: string;
  correo_adicional: string;
  nomenclatura_id: number;
  regimen_id: number;
  correlativo_contador: number;
  estado?: number;
  cuenta_debe?: string;
  cuenta_haber?: string;
}

export interface IEstablecimiento {
  id: number;
  nombre: string;
  numero_de_establecimiento: string;
  direccion_comercial?: string;
  fecha_de_inicio_de_operaciones: Date | null; // Prisma: DateTime?
  tipo_de_establecimiento: string;
  clasificacion_por_establecimiento: string;
  actividad_economica: string;
  estado: number;
  empresa_id: number;
}

export interface IContador {
  id?: number;
  nombre: string;
  nit: string;
  fecha_de_nombramiento: string;
  tipo_de_prestacion_del_servicio: string;
  estado?: number;
  empresa_id?: number;
}

export interface IRepresentante {
  id?: string;
  nombre: string;
  nit: string;
  fecha_de_nombramiento: string;
  tipo_de_representante: string;
  estado?: string;
  empresa_id?: number;
}
