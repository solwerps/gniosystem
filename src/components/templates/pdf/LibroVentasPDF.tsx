// src/components/templates/pdf/LibroVentasPDF.tsx
"use client";

import React, { useEffect, useState } from "react";
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
  tiposDocumentoVenta,
} from "@/utils";
import { obtenerEmpresa } from "@/utils/services/empresas";
import { obtenerLibroVentas } from "@/utils/services/libros";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <PDFLoader />,
  }
);

// Helpers numéricos
const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  const n = parseFloat(String(value).trim() || "0");
  return Number.isNaN(n) ? 0 : n;
};

const formatMonto = (value: string | number | null | undefined) =>
  parseMonto(parseFloat(String(value ?? "0")));

const parseString = (value: string | number) => formatMonto(value);

type LibroVentasPDFProps = {
  searchParams: any;
};

export const LibroVentasPDF: React.FC<LibroVentasPDFProps> = ({
  searchParams,
}) => {
  // Query params
  const date: string = searchParams?.date ?? "";
  const empresa: string = searchParams?.empresa ?? "0";
  const ordenParam: string = searchParams?.orden ?? "ascendente";
  const detalle: string = searchParams?.detalle ?? "false";
  const folio: string = searchParams?.folio ?? "0";

  const empresaId = Number(empresa) || 0;

  const ordenNormalizado =
    typeof ordenParam === "string" &&
    ordenParam.toLowerCase().startsWith("desc")
      ? "descendente"
      : "ascendente";

  const fechaParaTitulo = date
    ? date.length === 7
      ? `${date}-01`
      : date
    : "";

  const formatedDate = fechaParaTitulo
    ? moment(fechaParaTitulo, "YYYY-MM-DD").locale("es").format("MMMM YYYY")
    : "";

  const [documentos, setDocumentos] = useState<IFactura[]>([]);
  const [empresaInfo, setEmpresaInfo] = useState<any>({
    id: 0,
    nombre_empresa: "",
    nit: "",
    direccion_fiscal: "",
    sector: "",
    actividad_economica: "",
    nomenclatura_id: 0,
  });
  const [loading, setLoading] = useState(true);

  // Carga de datos
  useEffect(() => {
    const getData = async () => {
      try {
        if (!empresaId || !date) {
          setLoading(false);
          return;
        }

        const fechaFiltro = date; // "YYYY-MM"

        const [libroResp, empresaResp] = await Promise.all([
          obtenerLibroVentas(empresaId, fechaFiltro, true, ordenNormalizado),
          obtenerEmpresa(empresaId),
        ]);

        const {
          status,
          message,
          data: dataLibros,
        } = (libroResp as any) || { status: 500, message: "Err", data: [] };

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
            nombre_empresa: dataEmpresa.nombre_empresa ?? dataEmpresa.nombre ?? "",
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
        console.error("ERROR en getData LibroVentasPDF:", error);
        setDocumentos([]);
        setEmpresaInfo({});
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [date, empresa, empresaId, ordenParam, ordenNormalizado, detalle, folio]);

  // Folios usados
  useEffect(() => {
    if (typeof window === "undefined") return;

    const facturasPerPage = 20;
    const pageCount = Math.ceil(documentos.length / facturasPerPage);

    localStorage.setItem(
      "foliosUsed",
      JSON.stringify({
        libro: "2",
        foliosUsed: documentos.length === 0 ? 1 : pageCount,
        uuid: uuid(),
      })
    );
  }, [documentos.length]);

  // Lógica / cálculos específicos de ventas (tomados de Conta Cox)

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

  const documentos_exportaciones = ["exportaciones"];

  const docTransactionHandler = (documento: IFactura) => {
    const esExportacion = documentos_exportaciones.includes(
      (documento as any).tipo
    );
    const base =
      toNumber((documento as any).monto_bien) +
      toNumber((documento as any).monto_servicio);

    return {
      doc_tipo: esExportacion ? "E" : "L",
      monto_exportacion: esExportacion ? formatMonto(base) : formatMonto(0),
    };
  };

  const documentos_exentos_tipo = ["FPEQ", "RECI", "FCAP", "RDON"];
  const documentos_exentos = ["medicamentos", "exportaciones"];

  const docExentoHandler = (documento: IFactura) => {
    const esExento =
      documentos_exentos_tipo.includes(documento.tipo_dte as any) ||
      documentos_exentos.includes((documento as any).tipo);

    return {
      dte_exento: esExento ? documento.tipo_dte : "- - -",
      monto_exento: esExento
        ? parseString((documento as any).monto_total)
        : formatMonto(0),
    };
  };

  const renderTableHead = () => (
    <View style={styles.tableHead}>
      <Text style={[styles.column, { width: "5%" }]}>Fecha</Text>
      <Text style={[styles.column, { width: "6%" }]}>Serie</Text>
      <Text style={[styles.column, { width: "6%" }]}>
        Número de {"\n"} Documento
      </Text>
      <Text style={[styles.column, { width: "5%" }]}>Clase</Text>
      <Text style={[styles.column, { width: "5%" }]}>NIT del {"\n"} Cliente</Text>
      <Text style={[styles.column, { width: "20%" }]}>
        Nombre del Cliente
      </Text>
      <Text style={[styles.column, { width: "5%" }]}>
        Tipo de Transacción
      </Text>
      <Text style={[styles.column, { width: "6%" }]}>Bienes</Text>
      <Text style={[styles.column, { width: "6%" }]}>Servicios</Text>
      <Text style={[styles.column, { width: "6%" }]}>Exportaciones</Text>
      <Text style={[styles.column, { width: "6%" }]}>Exentos</Text>
      <Text style={[styles.column, { width: "6%" }]}>
        Tipo {"\n"} Impuesto
      </Text>
      <Text style={[styles.column, { width: "6%" }]}>
        Valor {"\n"} Impuesto
      </Text>
      <Text style={[styles.column, { width: "6%" }]}>IVA {"\n"} Débito</Text>
      <Text style={[styles.column, { width: "6%" }]}>Total</Text>
    </View>
  );

  const renderFilas = (facturas: IFactura[]) => (
    <View style={styles.tableBody}>
      {facturas.map((factura: IFactura, key) => (
        <View key={key} style={styles.rows}>
          <Text style={[styles.row, { width: "5%" }]}>
            {parseDate((factura as any).fecha_emision)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {(factura as any).serie}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {(factura as any).numero_dte}
          </Text>
          <Text style={[styles.row, { width: "5%" }]}>{factura.tipo_dte}</Text>
          <Text style={[styles.row, { width: "5%" }]}>
            {(factura as any).id_receptor}
          </Text>
          <Text style={[styles.row, { width: "20%" }]}>
            {(factura as any).nombre_receptor}
          </Text>
          <Text style={[styles.row, { width: "5%" }]}>
            {docTransactionHandler(factura).doc_tipo}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {parseString((factura as any).monto_bien)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {parseString((factura as any).monto_servicio)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {docTransactionHandler(factura).monto_exportacion}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {docExentoHandler(factura).monto_exento}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {impuestoHandler(factura).impuesto_abreviatura}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {impuestoHandler(factura).impuesto_valor}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {parseString((factura as any).iva)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
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
          <Text style={[styles.row, { width: "52%" }]}>VIENEN:</Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_bien)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_servicio)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_exportacion)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_exentos)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]} />
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_impuestos)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.iva)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
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
          <Text style={[styles.row, { width: "52%" }]}>VAN:</Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_bien)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_servicio)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_exportacion)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_exentos)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]} />
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_impuestos)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.iva)}
          </Text>
          <Text style={[styles.row, { width: "6%" }]}>
            {formatMonto(totales.monto_total)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderTotales = (documentosTotales: any[]) => {
    let monto_impuestos = 0;

    documentosTotales.forEach((factura: any) => {
      if (factura.fecha_anulacion) return;

      const esNotaCredito = factura.tipo_dte === "NCRE";
      const multiplicador = esNotaCredito ? -1 : 1;

      tipo_impuesto.forEach((impuesto) => {
        const valor = toNumber(factura[impuesto.key]);
        if (valor !== 0) {
          monto_impuestos += valor * multiplicador;
        }
      });
    });

    const totales = documentosTotales.reduce(
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

        const monto_exportacion = documentos_exportaciones.includes(
          factura.tipo
        )
          ? base
          : 0;

        const monto_exentos =
          documentos_exentos_tipo.includes(factura.tipo_dte) ||
          documentos_exentos.includes(factura.tipo)
            ? base
            : 0;

        accumulator.iva += iva;
        accumulator.monto_total += monto_total;
        accumulator.monto_bien += monto_bien;
        accumulator.monto_servicio += monto_servicio;
        accumulator.monto_exportacion += monto_exportacion;
        accumulator.monto_exentos += monto_exentos;

        return accumulator;
      },
      {
        iva: 0,
        monto_total: 0,
        monto_bien: 0,
        monto_servicio: 0,
        monto_exportacion: 0,
        monto_exentos: 0,
      }
    );

    return (
      <View style={styles.table}>
        <View style={[styles.tableBody, { backgroundColor: "#edebeb" }]}>
          <View style={styles.rows}>
            <Text
              style={[styles.row, { width: "52%", fontWeight: "bold" }]}
            >
              Totales:
            </Text>
            <Text style={[styles.row, { width: "6%" }]}>
              {formatMonto(totales.monto_bien)}
            </Text>
            <Text style={[styles.row, { width: "6%" }]}>
              {formatMonto(totales.monto_servicio)}
            </Text>
            <Text style={[styles.row, { width: "6%" }]}>
              {formatMonto(totales.monto_exportacion)}
            </Text>
            <Text style={[styles.row, { width: "6%" }]}>
              {formatMonto(totales.monto_exentos)}
            </Text>
            <Text style={[styles.row, { width: "6%" }]} />
            <Text style={[styles.row, { width: "6%" }]}>
              {formatMonto(monto_impuestos)}
            </Text>
            <Text style={[styles.row, { width: "6%" }]}>
              {formatMonto(totales.iva)}
            </Text>
            <Text style={[styles.row, { width: "6%" }]}>
              {formatMonto(totales.monto_total)}
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
          LIBRO DE VENTAS
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
    { value: "sin_derecho_credito_fiscal", obligatorio: true },
    { value: "medicamentos", obligatorio: false },
    { value: "exportaciones", obligatorio: true },
  ];

  const sumarMontos = (documentosSum: IFactura[], campo: string) =>
    documentosSum.reduce(
      (acc: number, doc: any) => acc + toNumber(doc[campo]),
      0
    );

  const calcularMontos = (docs: IFactura[]) => {
    const ncres = docs.filter((doc: any) => doc.tipo_dte === "NCRE");

    const monto_base =
      sumarMontos(
        docs.filter((doc: any) => doc.tipo_dte !== "NCRE"),
        "monto_bien"
      ) +
      sumarMontos(
        docs.filter((doc: any) => doc.tipo_dte !== "NCRE"),
        "monto_servicio"
      );

    const monto_impuesto = sumarMontos(
      docs.filter((doc: any) => doc.tipo_dte !== "NCRE"),
      "iva"
    );

    const monto_otros = docs.reduce((acc, doc: any) => {
      const otros = [
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
      ].reduce((sum, field) => sum + toNumber(field), 0);
      return acc + otros;
    }, 0);

    const monto_base_ncre =
      sumarMontos(ncres as IFactura[], "monto_bien") +
      sumarMontos(ncres as IFactura[], "monto_servicio");

    const monto_impuesto_ncre = sumarMontos(
      ncres as IFactura[],
      "iva"
    );

    return {
      monto_base: monto_base - monto_base_ncre,
      monto_impuesto: monto_impuesto - monto_impuesto_ncre,
      monto_otros,
    };
  };

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

    const facturas_emitidas = documentosResumen.filter(
      (documento: any) => documento.tipo_dte !== "NCRE"
    ).length;
    const ncre_emitidas = documentosResumen.filter(
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
              Monto
            </Text>
            <Text
              style={[
                styles.columnCompras,
                { width: "16.25%", textAlign: "right", paddingRight: 3 },
              ]}
            >
              Débito
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
              Total
            </Text>
          </View>
          <View style={styles.tableBody}>
            {resumenItems.map((item: any, key: number) => (
              <View style={styles.rows} key={key}>
                <Text
                  style={[
                    styles.columnCompras,
                    styles.capitalize,
                    { width: "35%", textAlign: "left", paddingLeft: 3 },
                  ]}
                >
                  {tiposDocumentoVenta.filter(
                    (option: any) => option.value === item.descripcion
                  )[0]?.label ?? ""}
                </Text>
                <Text
                  style={[
                    styles.columnCompras,
                    { width: "16.25%", textAlign: "right", paddingRight: 3 },
                  ]}
                >
                  {formatMonto(item.monto)}
                </Text>
                <Text
                  style={[
                    styles.columnCompras,
                    { width: "16.25%", textAlign: "right", paddingRight: 3 },
                  ]}
                >
                  {formatMonto(item.credito)}
                </Text>
                <Text
                  style={[
                    styles.columnCompras,
                    { width: "16.25%", textAlign: "right", paddingRight: 3 },
                  ]}
                >
                  {formatMonto(item.otros)}
                </Text>
                <Text
                  style={[
                    styles.columnCompras,
                    { width: "16.25%", textAlign: "right", paddingRight: 3 },
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
                SUMATORIA
              </Text>
              <Text
                style={[
                  styles.columnCompras,
                  { width: "16.25%", textAlign: "right", paddingRight: 3 },
                ]}
              >
                {formatMonto(summaryTotales.monto)}
              </Text>
              <Text
                style={[
                  styles.columnCompras,
                  { width: "16.25%", textAlign: "right", paddingRight: 3 },
                ]}
              >
                {formatMonto(summaryTotales.credito)}
              </Text>
              <Text
                style={[
                  styles.columnCompras,
                  { width: "16.25%", textAlign: "right", paddingRight: 3 },
                ]}
              >
                {formatMonto(summaryTotales.otros)}
              </Text>
              <Text
                style={[
                  styles.columnCompras,
                  { width: "16.25%", textAlign: "right", paddingRight: 3 },
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
              Facturas Emitidas
            </Text>
            <Text
              style={[
                styles.columnCompras,
                { width: "35%", textAlign: "right", paddingRight: 3 },
              ]}
            >
              {facturas_emitidas}
            </Text>
          </View>
          <View style={styles.rows}>
            <Text
              style={[
                styles.columnCompras,
                { width: "65%", textAlign: "left", paddingLeft: 3 },
              ]}
            >
              Notas de Crédito Emitidas
            </Text>
            <Text
              style={[
                styles.columnCompras,
                { width: "35%", textAlign: "right", paddingRight: 3 },
              ]}
            >
              {ncre_emitidas}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const calcularTotales = (documentosCalculo: any[]) => {
    let monto_impuestos = 0;

    documentosCalculo.forEach((factura: any) => {
      if (factura.fecha_anulacion) return;

      const esNotaCredito = factura.tipo_dte === "NCRE";
      const multiplicador = esNotaCredito ? -1 : 1;

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

        const monto_exportacion = documentos_exportaciones.includes(
          factura.tipo
        )
          ? base
          : 0;

        const monto_exentos =
          documentos_exentos_tipo.includes(factura.tipo_dte) ||
          documentos_exentos.includes(factura.tipo)
            ? base
            : 0;

        accumulator.iva += iva;
        accumulator.monto_total += monto_total;
        accumulator.monto_bien += monto_bien;
        accumulator.monto_servicio += monto_servicio;
        accumulator.monto_exportacion += monto_exportacion;
        accumulator.monto_exentos += monto_exentos;

        return accumulator;
      },
      {
        iva: 0,
        monto_total: 0,
        monto_bien: 0,
        monto_servicio: 0,
        monto_exportacion: 0,
        monto_exentos: 0,
      }
    );

    return {
      monto_servicio: totales.monto_servicio,
      monto_bien: totales.monto_bien,
      monto_exportacion: totales.monto_exportacion,
      monto_exentos: totales.monto_exentos,
      monto_impuestos,
      iva: totales.iva,
      monto_total: totales.monto_total,
    };
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
        title={`Libro de ventas ${
          empresaInfo.nombre_empresa ?? empresaInfo.nombre ?? ""
        } (${empresaInfo.nit ?? ""}) - ${formatedDate}`}
      >
        {renderPages()}
      </Document>
    </PDFViewer>
  );
};
