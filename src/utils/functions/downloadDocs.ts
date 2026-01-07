// src/utils/functions/downloadDocs.ts
import type { IFactura } from "@/utils/models/documentos";
import * as XLSX from "xlsx";

export const downloadDocs = (facturas: IFactura[]) => {
  // 1) Crear libro de Excel
  const wb = XLSX.utils.book_new();

  // 2) Encabezados bonitos -> mapean 1:1 a las keys de IFactura / Documento (Prisma)
  const headers = {
    fecha_trabajo: "Fecha de Trabajo",
    fecha_emision: "Fecha de Emisión",
    numero_autorizacion: "Número de Autorización",
    tipo_dte: "Tipo de DTE",
    serie: "Serie",
    numero_dte: "Número de DTE",
    nit_emisor: "NIT Emisor",
    nombre_emisor: "Nombre Emisor",
    codigo_establecimiento: "Código Establecimiento",
    nombre_establecimiento: "Nombre Establecimiento",
    id_receptor: "ID Receptor",
    nombre_receptor: "Nombre Receptor",
    nit_certificador: "NIT Certificador",
    nombre_certificador: "Nombre Certificador",
    moneda: "Moneda",
    monto_total: "Monto Total",
    monto_bien: "Monto Bien",
    monto_servicio: "Monto Servicio",
    factura_estado: "Estado Factura",
    marca_anulado: "Marca Anulado",
    fecha_anulacion: "Fecha de Anulación",
    iva: "IVA",
    petroleo: "Petróleo",
    turismo_hospedaje: "Turismo/Hospedaje",
    turismo_pasajes: "Turismo/Pasajes",
    timbre_prensa: "Timbre de Prensa",
    bomberos: "Bomberos",
    tasa_municipal: "Tasa Municipal",
    bebidas_alcoholicas: "Bebidas Alcohólicas",
    tabaco: "Tabaco",
    cemento: "Cemento",
    bebidas_no_alcoholicas: "Bebidas No Alcohólicas",
    tarifa_portuaria: "Tarifa Portuaria",
    tipo_operacion: "Tipo de Operación",
    cuenta_debe: "Cuenta Debe",
    cuenta_haber: "Cuenta Haber",
    tipo: "Tipo",
    empresa_id: "ID Empresa",
    estado: "Estado"
  } as const;

  // 3) Campos que deben ir como número en Excel
  const numericFields: (keyof IFactura)[] = [
    "monto_total",
    "monto_bien",
    "monto_servicio",
    "iva",
    "petroleo",
    "turismo_hospedaje",
    "turismo_pasajes",
    "timbre_prensa",
    "bomberos",
    "tasa_municipal",
    "bebidas_alcoholicas",
    "tabaco",
    "cemento",
    "bebidas_no_alcoholicas",
    "tarifa_portuaria"
  ];

  // 4) Construir filas a partir de las facturas
  const dataSheet = facturas.map((factura) => {
    return (Object.keys(headers) as (keyof typeof headers)[]).reduce(
      (obj, key) => {
        let value = factura[key as keyof IFactura];

        // Si es campo numérico, convertir a número (vienen usualmente como string)
        if (numericFields.includes(key as keyof IFactura)) {
          value = parseFloat(value as unknown as string) || 0;
        }

        const headerLabel = headers[key];
        (obj as any)[headerLabel] = value;
        return obj;
      },
      {} as Record<string, unknown>
    );
  });

  // 5) Crear hoja y anexarla al libro
  const ws = XLSX.utils.json_to_sheet(dataSheet);
  XLSX.utils.book_append_sheet(wb, ws, "Facturas");

  // 6) Descargar / escribir archivo
  XLSX.writeFile(wb, "Facturas_del_sistema.xlsx");
};
