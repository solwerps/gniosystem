// src/components/templates/pdf/LibroComprasPDF.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Document, Page, Text, View } from "@react-pdf/renderer";

import moment from "moment";
import "moment/locale/es";
import { v4 as uuid } from "uuid";

import { PDFLoader } from "@/components/atoms/loaders/PDFLoader";
import { styles } from "@/components/templates/pdf/style";

import type { IFactura } from "@/utils";
import {
  parseDate,
  parseMonto,
  tipo_impuesto,
  tiposDocumentoCompra,
} from "@/utils";
import { obtenerEmpresa } from "@/utils/services/empresas";
import { obtenerDocumentosLibrosCompras } from "@/utils/services/libros";

/* =========================================================
 * Wrapper de PDFViewer (soluciona errores TS/ESLint)
 * ========================================================= */

type PDFViewerWrapperProps = {
  className?: string;
  children: React.ReactNode;
};

const PDFViewer = dynamic<PDFViewerWrapperProps>(
  async () => {
    const mod = await import("@react-pdf/renderer");
    const Inner = mod.PDFViewer;

    const PDFViewerWrapper: React.FC<PDFViewerWrapperProps> = ({
      className,
      children,
    }) => {
      return (
        <div className={className}>
          {/* El PDFViewer real recibe el <Document /> como hijo */}
          <Inner style={{ width: "100%", height: "100%" }}>
            {children as any}
          </Inner>
        </div>
      );
    };

    PDFViewerWrapper.displayName = "PDFViewerWrapper";

    return PDFViewerWrapper;
  },
  {
    ssr: false,
    loading: () => <PDFLoader />,
  }
);

/* =========================================================
 * Helpers numéricos
 * ========================================================= */

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  const n = parseFloat(String(value).trim() || "0");
  return Number.isNaN(n) ? 0 : n;
};

// Garantizar que parseMonto SIEMPRE reciba string/number consistente
const formatMonto = (value: string | number | null | undefined) =>
  parseMonto(parseFloat(String(value ?? "0")));

const parseString = (value: string | number) => formatMonto(value);

/* =========================================================
 * Componente principal
 * ========================================================= */

type LibroComprasPDFProps = {
  searchParams: any;
};

export const LibroComprasPDF: React.FC<LibroComprasPDFProps> = ({
  searchParams,
}) => {
  /* =========================
   * Query params
   * ========================= */
  const date: string = searchParams?.date ?? ""; // esperado "YYYY-MM"
  const empresa: string = searchParams?.empresa ?? "0";
  const ordenParam: string = searchParams?.orden ?? "ascendente";
  const detalle: string = searchParams?.detalle ?? "false";
  const folio: string = searchParams?.folio ?? "0";

  const empresaId = Number(empresa) || 0;

  const ordenNormalizado: "ascendente" | "descendente" =
    typeof ordenParam === "string" &&
    ordenParam.toLowerCase().startsWith("desc")
      ? "descendente"
      : "ascendente";

  // Fecha: para título uso YYYY-MM-01, pero para el filtro mando YYYY-MM (string)
  const fechaParaTitulo = date
    ? date.length === 7
      ? `${date}-01`
      : date
    : "";

  const formatedDate = fechaParaTitulo
    ? moment(fechaParaTitulo, "YYYY-MM-DD").locale("es").format("MMMM YYYY")
    : "";

  /* =========================
   * Estados
   * ========================= */
  const [documentos, setDocumentos] = React.useState<IFactura[]>([]);
  const [empresaInfo, setEmpresaInfo] = React.useState<any>({
    id: 0,
    nombre_empresa: "",
    nit: "",
    direccion_fiscal: "",
    sector: "",
    actividad_economica: "",
    nomenclatura_id: 0,
  });
  const [loading, setLoading] = React.useState(true);

  /* =========================
   * Carga de datos
   * ========================= */
  React.useEffect(() => {
    const getData = async () => {
      try {
        console.log("LibroComprasPDF → params:", {
          date,
          empresa,
          empresaId,
          ordenParam,
          ordenNormalizado,
          detalle,
          folio,
        });

        if (!empresaId || !date) {
          console.log(
            "NO se llama a los servicios porque falta date o empresaId",
            { date, empresaId }
          );
          setLoading(false);
          return;
        }

        const fechaFiltro = date; // "YYYY-MM" (string), lo que espera tu service/API

        const [libroResp, empresaResp] = await Promise.all([
          obtenerDocumentosLibrosCompras(
            empresaId,
            fechaFiltro,
            false,
            ordenNormalizado
          ),
          obtenerEmpresa(empresaId),
        ]);

        console.log("LIBRO RESP:", libroResp);
        console.log("EMPRESA RESP:", empresaResp);

        // Libros: { status, data, message }
        const {
          status,
          message,
          data: dataLibros,
        } = (libroResp as any) || { status: 500, message: "Err", data: [] };

        // Empresa: soportar tanto {status, data} como {ok, data}
        const empresaAny = (empresaResp as any) || {};
        const statusEmpresa =
          empresaAny.status ?? (empresaAny.ok ? 200 : 500);
        const messageEmpresa = empresaAny.message ?? empresaAny.error ?? "";
        const dataEmpresa = empresaAny.data;

        if (status === 200 && statusEmpresa === 200 && dataEmpresa) {
          setDocumentos(dataLibros ?? []);

          const direccion =
            (dataEmpresa.infoJuridico as any)?.direccion ||
            (dataEmpresa.infoIndividual as any)?.direccion ||
            dataEmpresa.direccion_fiscal ||
            dataEmpresa.direccionFiscal ||
            "";

          setEmpresaInfo({
            id: dataEmpresa.id,
            nombre_empresa:
              dataEmpresa.nombre_empresa ?? dataEmpresa.nombre ?? "",
            nombre: dataEmpresa.nombre ?? "",
            razon_social:
              dataEmpresa.razon_social ?? dataEmpresa.razonSocial ?? "",
            razonSocial: dataEmpresa.razonSocial ?? "",
            nit: dataEmpresa.nit ?? "",
            direccion_fiscal: direccion,
            direccionFiscal: direccion,
            sector: dataEmpresa.sectorEconomico ?? "",
            actividad_economica:
              dataEmpresa.sectorEconomico ??
              dataEmpresa.actividad_economica ??
              "",
            nomenclatura_id:
              dataEmpresa.afiliaciones?.nomenclaturaId ??
              dataEmpresa.nomenclatura_id ??
              0,
          });
        } else {
          console.error("Error al obtener datos", {
            status,
            message,
            statusEmpresa,
            messageEmpresa,
          });
          setDocumentos([]);
          setEmpresaInfo({});
        }
      } catch (error) {
        console.error("ERROR en getData LibroComprasPDF:", error);
        setDocumentos([]);
        setEmpresaInfo({});
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [date, empresa, empresaId, ordenParam, ordenNormalizado, detalle, folio]);

  /* =========================
   * Guardar folios en localStorage
   * ========================= */
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const facturasPerPage = 20;
    const pageCount = Math.ceil(documentos.length / facturasPerPage);

    localStorage.setItem(
      "foliosUsed",
      JSON.stringify({
        libro: "1",
        foliosUsed: documentos.length === 0 ? 1 : pageCount,
        uuid: uuid(),
      })
    );
  }, [documentos.length]);

  /* =========================
   * Helpers de cálculo
   * ========================= */

  const documentos_exentos = ["FPEQ", "RECI", "FCAP", "RDON"];

  const documentos_importaciones = [
    "importaciones_centro_america",
    "importaciones_resto_mundo",
    "importacion_activos_fijos",
  ];

  const documentos_activos_fijos = [
    "compra_activos_fijos",
    "vehiculos_modelos_anteriores",
    "vehiculos_nuevos",
  ];

  const impuestoHandler = (factura: any) => {
    for (const impuesto of tipo_impuesto) {
      const valor = toNumber(factura[impuesto.key]);
      if (valor !== 0) {
        return {
          impuesto_abreviatura: impuesto.abeviacion,
          impuesto_valor: valor,
        };
      }
    }
    return { impuesto_abreviatura: "- - - -", impuesto_valor: 0 };
  };

  const docExentoHandler = (documento: IFactura) => {
    const esExento = documentos_exentos.includes(documento.tipo_dte);

    return {
      dte_exento: esExento ? documento.tipo_dte : "- - -",
      monto_exento: esExento ? parseString(documento.monto_total) : 0,
    };
  };

  const importacionHandler = (documento: IFactura) => {
    const esImportacion = documentos_importaciones.includes(documento.tipo);

    const montoBien = toNumber((documento as any).monto_bien);
    const montoServicio = toNumber((documento as any).monto_servicio);
    const base = montoBien + montoServicio;

    return {
      doc_tipo: esImportacion ? "I" : "L",
      monto_importacion: esImportacion ? formatMonto(base) : formatMonto(0),
    };
  };

  const fpeqHandler = (documento: IFactura) => {
    const esFpeq = documento.tipo_dte === "FPEQ";

    const montoBien = toNumber((documento as any).monto_bien);
    const montoServicio = toNumber((documento as any).monto_servicio);
    const base = montoBien + montoServicio;

    return esFpeq ? formatMonto(base) : formatMonto(0);
  };

  const combustibleHandler = (documento: IFactura) => {
    const esCombustible = documento.tipo === "combustibles";

    const montoBien = toNumber((documento as any).monto_bien);
    const montoServicio = toNumber((documento as any).monto_servicio);
    const base = montoBien + montoServicio;

    return esCombustible ? formatMonto(base) : formatMonto(0);
  };

  const activosHandler = (documento: IFactura) => {
    const esActivos = documentos_activos_fijos.includes(documento.tipo);

    const montoBien = toNumber((documento as any).monto_bien);
    const montoServicio = toNumber((documento as any).monto_servicio);
    const base = montoBien + montoServicio;

    return esActivos ? formatMonto(base) : formatMonto(0);
  };

  /* =========================
   * Render cabecera / tabla
   * ========================= */

  const renderTableHead = () => (
    <View style={styles.tableHead}>
      <Text style={[styles.columnCompras, { width: "5%" }]}>Fecha</Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>Serie</Text>
      <Text style={[styles.columnCompras, { width: "6%" }]}>
        Número de {"\n"} Documento
      </Text>
      <Text style={[styles.columnCompras, { width: "4%" }]}>Clase</Text>
      <Text style={[styles.columnCompras, { width: "12%" }]}>
        Nombre del Proveedor
      </Text>
      <Text style={[styles.columnCompras, { width: "6%" }]}>
        NIT del {"\n"} Proveedor
      </Text>
      <Text style={[styles.columnCompras, { width: "6%" }]}>
        Tipo de {"\n"} Transacción
      </Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>Biene</Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>Servicios</Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>Exentos</Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>
        Importaciones
      </Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>
        {`Combustibles ${"\n"} (Sin IDP)`}
      </Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>
        Pequeños {"\n"} Contribuyentes
      </Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>
        Compras {"\n"} Activos Fijos
      </Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>
        Tipo {"\n"} Impuesto
      </Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>
        Valor {"\n"} Impuesto
      </Text>
      <Text style={[styles.columnCompras, { width: "5%" }]}>
        IVA {"\n"} Crédito
      </Text>
      <Text style={[styles.columnCompras, { width: "6%" }]}>Total</Text>
    </View>
  );

  const renderFilas = (facturas: IFactura[]) => (
    <View style={styles.tableBody}>
      {facturas.map((factura: IFactura, index) => (
        <View key={`row-${index}`} style={styles.rows}>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {parseDate((factura as any).fecha_emision)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {(factura as any).serie}
          </Text>
          <Text style={[styles.rowCompras, { width: "6%" }]}>
            {(factura as any).numero_dte}
          </Text>
          <Text style={[styles.rowCompras, { width: "4%" }]}>
            {factura.tipo_dte}
          </Text>
          <Text style={[styles.rowCompras, { width: "12%" }]}>
            {(factura as any).nombre_emisor}
          </Text>
          <Text style={[styles.rowCompras, { width: "6%" }]}>
            {(factura as any).nit_emisor}
          </Text>
          <Text style={[styles.rowCompras, { width: "6%" }]}>
            {importacionHandler(factura).doc_tipo}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {parseString((factura as any).monto_bien)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {parseString((factura as any).monto_servicio)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {docExentoHandler(factura).monto_exento}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {importacionHandler(factura).monto_importacion}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {combustibleHandler(factura)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {fpeqHandler(factura)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {activosHandler(factura)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {impuestoHandler(factura).impuesto_abreviatura}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(impuestoHandler(factura).impuesto_valor)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {parseString((factura as any).iva)}
          </Text>
          <Text style={[styles.rowCompras, { width: "6%" }]}>
            {parseString((factura as any).monto_total)}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderVienen = (totales: any) => (
    <View style={styles.table}>
      <View style={[styles.tableBody, { backgroundColor: "#edebeb" }]}>
        <View style={styles.rowVienenVan}>
          <Text style={[styles.rowCompras, { width: "44%" }]}>VIENEN:</Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_bien)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_servicio)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_exentos)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_importaciones)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_combustibles)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_fpeq)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_activos)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]} />
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_impuestos)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.iva)}
          </Text>
          <Text style={[styles.rowCompras, { width: "6%" }]}>
            {formatMonto(totales.monto_total)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderVan = (totales: any) => (
    <View style={styles.table}>
      <View style={[styles.tableBody, { backgroundColor: "#edebeb" }]}>
        <View style={styles.rowVienenVan}>
          <Text style={[styles.rowCompras, { width: "44%" }]}>VAN:</Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_bien)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_servicio)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_exentos)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_importaciones)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_combustibles)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_fpeq)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_activos)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]} />
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.monto_impuestos)}
          </Text>
          <Text style={[styles.rowCompras, { width: "5%" }]}>
            {formatMonto(totales.iva)}
          </Text>
          <Text style={[styles.rowCompras, { width: "6%" }]}>
            {formatMonto(totales.monto_total)}
          </Text>
        </View>
      </View>
    </View>
  );

  const calcularTotales = (documentosCalculo: any[]) => {
    let monto_impuestos = 0;
    let monto_exentos = 0;

    documentosCalculo.forEach((factura: any) => {
      if (factura.fecha_anulacion) return;

      const esNotaCredito = factura.tipo_dte === "NCRE";
      const multiplicador = esNotaCredito ? -1 : 1;

      if (
        factura.iva === "0.00" ||
        documentos_exentos.includes(factura.tipo_dte)
      ) {
        monto_exentos += toNumber(factura.monto_total) * multiplicador;
      }

      tipo_impuesto.forEach((impuesto) => {
        const valor = toNumber(factura[impuesto.key]);
        if (valor !== 0) monto_impuestos += valor * multiplicador;
      });
    });

    const totales = documentosCalculo.reduce(
      (accumulator: any, factura: any) => {
        if (factura.fecha_anulacion) return accumulator;

        const esNotaCredito = factura.tipo_dte === "NCRE";
        const multiplicador = esNotaCredito ? -1 : 1;

        const iva = toNumber(factura.iva) * multiplicador;
        const monto_total = toNumber(factura.monto_total) * multiplicador;
        const monto_bien = toNumber(factura.monto_bien) * multiplicador;
        const monto_servicio =
          toNumber(factura.monto_servicio) * multiplicador;

        const base = monto_bien + monto_servicio;

        const monto_importaciones = documentos_importaciones.includes(
          factura.tipo
        )
          ? base
          : 0;
        const monto_combustibles =
          factura.tipo === "combustibles" ? base : 0;
        const monto_fpeq = factura.tipo_dte === "FPEQ" ? base : 0;
        const monto_activos = documentos_activos_fijos.includes(
          factura.tipo
        )
          ? base
          : 0;

        accumulator.iva += iva;
        accumulator.monto_total += monto_total;
        accumulator.monto_bien += monto_bien;
        accumulator.monto_servicio += monto_servicio;
        accumulator.monto_importaciones += monto_importaciones;
        accumulator.monto_combustibles += monto_combustibles;
        accumulator.monto_fpeq += monto_fpeq;
        accumulator.monto_activos += monto_activos;

        return accumulator;
      },
      {
        iva: 0,
        monto_total: 0,
        monto_bien: 0,
        monto_servicio: 0,
        monto_importaciones: 0,
        monto_combustibles: 0,
        monto_fpeq: 0,
        monto_activos: 0,
      }
    );

    return {
      monto_exentos,
      monto_servicio: totales.monto_servicio,
      monto_bien: totales.monto_bien,
      monto_importaciones: totales.monto_importaciones,
      monto_combustibles: totales.monto_combustibles,
      monto_fpeq: totales.monto_fpeq,
      monto_activos: totales.monto_activos,
      monto_impuestos,
      iva: totales.iva,
      monto_total: totales.monto_total,
    };
  };

  const renderTotales = (documentosTotales: any[]) => {
    const totalesCalculo = calcularTotales(documentosTotales);

    return (
      <View style={styles.table}>
        <View style={[styles.tableBody, { backgroundColor: "#edebeb" }]}>
          <View style={styles.rowVienenVan}>
            <Text
              style={[
                styles.rowCompras,
                { width: "44%", fontWeight: "bold" },
              ]}
            >
              Totales:
            </Text>
            <Text style={[styles.rowCompras, { width: "5%" }]}>
              {formatMonto(totalesCalculo.monto_bien)}
            </Text>
            <Text style={[styles.rowCompras, { width: "5%" }]}>
              {formatMonto(totalesCalculo.monto_servicio)}
            </Text>
            <Text style={[styles.rowCompras, { width: "5%" }]}>
              {formatMonto(totalesCalculo.monto_exentos)}
            </Text>
            <Text style={[styles.rowCompras, { width: "5%" }]}>
              {formatMonto(totalesCalculo.monto_importaciones)}
            </Text>
            <Text style={[styles.rowCompras, { width: "5%" }]}>
              {formatMonto(totalesCalculo.monto_combustibles)}
            </Text>
            <Text style={[styles.rowCompras, { width: "5%" }]}>
              {formatMonto(totalesCalculo.monto_fpeq)}
            </Text>
            <Text style={[styles.rowCompras, { width: "5%" }]}>
              {formatMonto(totalesCalculo.monto_activos)}
            </Text>
            <Text style={[styles.rowCompras, { width: "5%" }]} />
            <Text style={[styles.rowCompras, { width: "5%" }]}>
              {formatMonto(totalesCalculo.monto_impuestos)}
            </Text>
            <Text style={[styles.rowCompras, { width: "5%" }]}>
              {formatMonto(totalesCalculo.iva)}
            </Text>
            <Text style={[styles.rowCompras, { width: "5%" }]}>
              {formatMonto(totalesCalculo.monto_total)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEncabezado = (page: number) => (
    <View style={[styles.header, styles.flexColumn]}>
      <View style={{ width: "100%", position: "absolute" }}>
        <Text style={{ fontSize: 8, textAlign: "right" }}>
          Folio: {parseFloat(folio) + page}
        </Text>
      </View>
      <View style={styles.flexCenter}>
        <Text
          style={[
            styles.title,
            styles.blue,
            { fontSize: 9.5, marginTop: -8 },
          ]}
        >
          LIBRO DE COMPRAS
        </Text>
        <Text style={{ fontSize: 8, textTransform: "uppercase" }}>
          {formatedDate}
        </Text>
      </View>
      <View style={styles.displayFlex}>
        <View style={styles.flexColumn}>
          <Text style={{ fontSize: 7 }}>
            Nombre Comercial:{" "}
            {empresaInfo.nombre_empresa ?? empresaInfo.nombre ?? ""}
          </Text>
          <Text style={{ fontSize: 7 }}>
            Razón Social:{" "}
            {empresaInfo.razon_social ?? empresaInfo.razonSocial ?? ""}
          </Text>
          <Text style={{ fontSize: 7 }}>NIT: {empresaInfo.nit}</Text>
          <Text style={{ fontSize: 7 }}>
            Dirección:{" "}
            {empresaInfo.direccion_fiscal ??
              empresaInfo.direccionFiscal ??
              ""}
          </Text>
        </View>

        <View>
          <Text
            style={[
              { fontSize: 7, textTransform: "capitalize" },
              styles.blue,
            ]}
          >
            Página: {page + 1}
          </Text>
          <Text style={{ fontSize: 7 }}>Fecha: {formatedDate}</Text>
        </View>
      </View>
    </View>
  );

  const tipos = [
    { value: "bien", obligatorio: true },
    { value: "servicio", obligatorio: true },
    { value: "bien_y_servicio", obligatorio: false },
    { value: "combustibles", obligatorio: true },
    { value: "pequeno_contribuyente", obligatorio: true },
    { value: "sin_derecho_credito_fiscal", obligatorio: true },
    { value: "medicamentos", obligatorio: false },
    { value: "vehiculos_nuevos", obligatorio: false },
    { value: "vehiculos_modelos_anteriores", obligatorio: false },
    { value: "importaciones_centro_america", obligatorio: false },
    { value: "importaciones_resto_mundo", obligatorio: true },
    { value: "adquisiciones_fyduca", obligatorio: false },
    { value: "compra_activos_fijos", obligatorio: true },
    { value: "importacion_activos_fijos", obligatorio: false },
  ];

  const sumarMontos = (documentosSum: IFactura[], campo: string) =>
    documentosSum.reduce(
      (acc: number, doc: any) => acc + toNumber(doc[campo]),
      0
    );

  const calcularMontos = (docs: IFactura[]) =>
    docs.reduce(
      (
        acc: {
          monto_base: number;
          monto_impuesto: number;
          monto_otros: number;
        },
        doc: any
      ) => {
        if (doc.fecha_anulacion) return acc;

        const esNotaCredito = doc.tipo_dte === "NCRE";
        const multiplicador = esNotaCredito ? -1 : 1;

        const montoBien = toNumber(doc.monto_bien) * multiplicador;
        const montoServicio =
          toNumber(doc.monto_servicio) * multiplicador;
        const iva = toNumber(doc.iva) * multiplicador;

        const otros =
          [
            doc.petroleo,
            doc.turismo_hospedaje,
            doc.turismo_pasajes,
            doc.timbre_prensa,
            doc.bomberos,
            doc.tasa_municipal,
            doc.bebidas_alcoholicas,
            doc.tabaco,
            doc.cemento,
            doc.bebidas_no_alcoholicas,
            doc.tarifa_portuaria,
          ].reduce((sum: number, field: unknown) => sum + toNumber(field), 0) *
          multiplicador;

        acc.monto_base += montoBien + montoServicio;
        acc.monto_impuesto += iva;
        acc.monto_otros += otros;

        return acc;
      },
      { monto_base: 0, monto_impuesto: 0, monto_otros: 0 }
    );

  const getMontosPorTipo = (documentosTipo: IFactura[], tipo: string) => {
    const bien_y_servicio = documentosTipo.filter(
      (doc: any) => doc.tipo === "bien_y_servicio"
    );

    const montoTotal = sumarMontos(
      bien_y_servicio as IFactura[],
      tipo === "bien" ? "monto_bien" : "monto_servicio"
    );

    const ivaProporcional = montoTotal * 0.12;

    const { monto_otros } = calcularMontos(
      bien_y_servicio as IFactura[]
    );

    return {
      monto: parseFloat(montoTotal.toFixed(2)),
      credito: parseFloat(ivaProporcional.toFixed(2)),
      descuentos: tipo === "bien" ? monto_otros : 0,
    };
  };

  const renderResumen = (documentosResumen: IFactura[]) => {
    const filteredDocs = documentosResumen.filter(
      (doc: any) => !doc.fecha_anulacion
    );

    const resumenItems = tipos
      .filter((tipo) => tipo.value !== "bien_y_servicio")
      .map((tipo) => {
        if (tipo.value === "bien" || tipo.value === "servicio") {
          const { monto, credito, descuentos } = getMontosPorTipo(
            filteredDocs,
            tipo.value
          );
          const {
            monto_base,
            monto_impuesto,
            monto_otros,
          } = calcularMontos(
            filteredDocs.filter(
              (doc: any) => doc.tipo === tipo.value
            )
          );

          return {
            descripcion: tipo.value,
            monto: monto + monto_base,
            credito: credito + monto_impuesto,
            otros: monto_otros + descuentos,
          };
        }

        const docsPorTipo = filteredDocs.filter(
          (doc: any) => doc.tipo === tipo.value
        );
        if (!tipo.obligatorio && !docsPorTipo.length) return null;

        const {
          monto_base,
          monto_impuesto,
          monto_otros,
        } = calcularMontos(docsPorTipo);

        return {
          descripcion: tipo.value,
          monto: monto_base,
          credito: monto_impuesto,
          otros: monto_otros,
        };
      })
      .filter((item) => item !== null) as any[];

    const summaryTotales = resumenItems.reduce(
      (totales: any, item: any) => {
        if (!item) return totales;

        const totalLinea = item.monto + item.credito + item.otros;

        return {
          monto: totales.monto + item.monto,
          credito: totales.credito + item.credito,
          otros: totales.otros + item.otros,
          total: totales.total + totalLinea,
        };
      },
      { monto: 0, credito: 0, otros: 0, total: 0 }
    );

    const facturas_recibidas = documentosResumen.filter(
      (documento: any) => documento.tipo_dte !== "NCRE"
    ).length;
    const ncre_recibidas = documentosResumen.filter(
      (documento: any) => documento.tipo_dte === "NCRE"
    ).length;

    return (
      <View break>
        <View style={styles.header}>
          <Text style={[styles.title, styles.blue]}>Resumen</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text
              style={[
                styles.columnCompras,
                { width: "35%", textAlign: "left", paddingLeft: 3 },
              ]}
            >
              Descripción
            </Text>
            <Text
              style={[
                styles.columnCompras,
                { width: "16.25%", textAlign: "right", paddingRight: 3 },
              ]}
            >
              Precio Neto
            </Text>
            <Text
              style={[
                styles.columnCompras,
                { width: "16.25%", textAlign: "right", paddingRight: 3 },
              ]}
            >
              IVA Crédito
            </Text>
            <Text
              style={[
                styles.columnCompras,
                { width: "16.25%", textAlign: "right", paddingRight: 3 },
              ]}
            >
              Otros
            </Text>
            <Text
              style={[
                styles.columnCompras,
                { width: "16.25%", textAlign: "right", paddingRight: 3 },
              ]}
            >
              Precio Total
            </Text>
          </View>
          <View style={styles.tableBody}>
            {resumenItems.map((item: any) => (
              <View style={styles.rows} key={item.descripcion}>
                <Text
                  style={[
                    styles.columnCompras,
                    styles.capitalize,
                    {
                      width: "35%",
                      textAlign: "left",
                      paddingLeft: 3,
                    },
                  ]}
                >
                  {tiposDocumentoCompra.filter(
                    (option: any) => option.value === item.descripcion
                  )[0]?.label ?? ""}
                </Text>
                <Text
                  style={[
                    styles.columnCompras,
                    {
                      width: "16.25%",
                      textAlign: "right",
                      paddingRight: 3,
                    },
                  ]}
                >
                  {formatMonto(item.monto)}
                </Text>
                <Text
                  style={[
                    styles.columnCompras,
                    {
                      width: "16.25%",
                      textAlign: "right",
                      paddingRight: 3,
                    },
                  ]}
                >
                  {formatMonto(item.credito)}
                </Text>
                <Text
                  style={[
                    styles.columnCompras,
                    {
                      width: "16.25%",
                      textAlign: "right",
                      paddingRight: 3,
                    },
                  ]}
                >
                  {formatMonto(item.otros)}
                </Text>
                <Text
                  style={[
                    styles.columnCompras,
                    {
                      width: "16.25%",
                      textAlign: "right",
                      paddingRight: 3,
                    },
                  ]}
                >
                  {formatMonto(item.monto + item.credito + item.otros)}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.tableBody}>
            <View style={styles.rows}>
              <Text
                style={[
                  styles.columnCompras,
                  styles.bold,
                  {
                    width: "35%",
                    textAlign: "left",
                    paddingLeft: 3,
                  },
                ]}
              >
                Sumatoria
              </Text>
              <Text
                style={[
                  styles.columnCompras,
                  {
                    width: "16.25%",
                    textAlign: "right",
                    paddingRight: 3,
                  },
                ]}
              >
                {formatMonto(summaryTotales.monto)}
              </Text>
              <Text
                style={[
                  styles.columnCompras,
                  {
                    width: "16.25%",
                    textAlign: "right",
                    paddingRight: 3,
                  },
                ]}
              >
                {formatMonto(summaryTotales.credito)}
              </Text>
              <Text
                style={[
                  styles.columnCompras,
                  {
                    width: "16.25%",
                    textAlign: "right",
                    paddingRight: 3,
                  },
                ]}
              >
                {formatMonto(summaryTotales.otros)}
              </Text>
              <Text
                style={[
                  styles.columnCompras,
                  {
                    width: "16.25%",
                    textAlign: "right",
                    paddingRight: 3,
                  },
                ]}
              >
                {formatMonto(summaryTotales.total)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.table, { marginTop: 10 }]}>
          <View style={styles.tableHead}>
            <Text
              style={[
                styles.columnCompras,
                { width: "65%", textAlign: "left", paddingLeft: 3 },
              ]}
            >
              Descripción
            </Text>
            <Text
              style={[
                styles.columnCompras,
                { width: "35%", textAlign: "right", paddingRight: 3 },
              ]}
            >
              Cantidad
            </Text>
          </View>
          <View style={styles.rows}>
            <Text
              style={[
                styles.columnCompras,
                { width: "65%", textAlign: "left", paddingLeft: 3 },
              ]}
            >
              Facturas Recibidas
            </Text>
            <Text
              style={[
                styles.columnCompras,
                { width: "35%", textAlign: "right", paddingRight: 3 },
              ]}
            >
              {facturas_recibidas}
            </Text>
          </View>
          <View style={styles.rows}>
            <Text
              style={[
                styles.columnCompras,
                { width: "65%", textAlign: "left", paddingLeft: 3 },
              ]}
            >
              Notas de Crédito Recibidas
            </Text>
            <Text
              style={[
                styles.columnCompras,
                { width: "35%", textAlign: "right", paddingRight: 3 },
              ]}
            >
              {ncre_recibidas}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPages = () => {
    const facturasPerPage = 20;
    const pageCount = Math.ceil(documentos.length / facturasPerPage);

    if (documentos.length === 0) {
      return [
        <Page
          key="empty"
          size="LETTER"
          style={styles.page}
          orientation="landscape"
        >
          {renderEncabezado(0)}
          <View style={styles.table}>
            {renderTableHead()}
            <View
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={styles.bold}>S/M</Text>
            </View>
          </View>
        </Page>,
      ];
    }

    const pages: React.ReactElement[] = [];
    let facturasVan: any[] = [];
    const facturasVienen: any[] = [];

    for (let index = 0; index < pageCount; index++) {
      const startIndex = index * facturasPerPage;
      const endIndex = Math.min(
        startIndex + facturasPerPage,
        documentos.length
      );
      const documentosPage = documentos.slice(startIndex, endIndex);
      facturasVan = [...facturasVienen, ...documentosPage];

      const vienenTotales = calcularTotales(facturasVienen);
      const vanTotales = calcularTotales(facturasVan);

      pages.push(
        <Page
          key={`page-${index}`}
          size="LETTER"
          style={styles.page}
          orientation="landscape"
        >
          {renderEncabezado(index)}
          <View style={styles.table}>
            {renderTableHead()}
            {index > 0 ? renderVienen(vienenTotales) : null}
            {renderFilas(documentosPage)}
            {index < pageCount - 1 ? renderVan(vanTotales) : null}
            {index === pageCount - 1 ? renderTotales(documentos) : null}
          </View>
          {index === pageCount - 1 && detalle === "true"
            ? renderResumen(documentos)
            : null}
        </Page>
      );

      facturasVienen.push(...documentosPage);
    }

    return pages;
  };

  /* =========================
   * Render principal
   * ========================= */

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <PDFLoader />
      </div>
    );
  }

  return (
    <PDFViewer className="h-screen w-screen">
      <Document
        title={`Libro de compras ${
          empresaInfo.nombre_empresa ?? empresaInfo.nombre ?? ""
        } (${empresaInfo.nit ?? ""}) - ${formatedDate}`}
      >
        {renderPages()}
      </Document>
    </PDFViewer>
  );
};
