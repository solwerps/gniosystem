// src/components/templates/pdf/LibroDiarioDetallePDF.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer/lib/react-pdf.browser";
import moment from "moment";
import "moment/locale/es";
import { v4 as uuid } from "uuid";

import { PDFLoader } from "@/components/atoms/loaders/PDFLoader";
import { EmptyPage } from "@/components/templates/pdf/EmptyPage";
import { LoadingDocumentPDF } from "@/components/templates/pdf/LoadingDocumentPDF";
import { styles } from "@/components/templates/pdf/style";

import type { Cuenta, IGetAsientoContable } from "@/utils";
import { parseMonto } from "@/utils";
import { obtenerEmpresa } from "@/utils/services/empresas";
import { obtenerAsientosLDiario } from "@/utils/services/libros";
import { obtenerCuentasByEmpresa } from "@/utils/services/nomenclatura";

type Props = {
  searchParams: any;
};

type CuentaResumen = {
  cuenta: string;
  descripcion: string;
  monto_debe: number;
  monto_haber: number;
};

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  const parsed = Number.parseFloat(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeCuenta = (value: unknown): string =>
  String(value ?? "").trim();

const buildResumen = (
  cuentasPrincipales: Cuenta[],
  asientos: IGetAsientoContable[]
): CuentaResumen[] => {
  if (!cuentasPrincipales.length || !asientos.length) return [];

  const resumen = new Map<string, CuentaResumen>();

  cuentasPrincipales.forEach((cuenta) => {
    resumen.set(cuenta.cuenta, {
      cuenta: cuenta.cuenta,
      descripcion: cuenta.descripcion,
      monto_debe: 0,
      monto_haber: 0,
    });
  });

  asientos.forEach((asiento) => {
    (asiento.partidas ?? []).forEach((partida) => {
      const codigo = normalizeCuenta(partida.cuenta);
      if (!codigo) return;

      const cuentaPrincipal = cuentasPrincipales.find((c) =>
        codigo.startsWith(normalizeCuenta(c.cuenta))
      );

      if (!cuentaPrincipal) return;

      const item = resumen.get(cuentaPrincipal.cuenta);
      if (!item) return;

      item.monto_debe += toNumber(partida.monto_debe);
      item.monto_haber += toNumber(partida.monto_haber);
    });
  });

  const valores = Array.from(resumen.values());

  const cuentasDebe = valores
    .filter((item) => item.monto_debe > 0)
    .map((item) => ({
      cuenta: item.cuenta,
      descripcion: item.descripcion,
      monto_debe: item.monto_debe,
      monto_haber: 0,
    }));

  const cuentasHaber = valores
    .filter((item) => item.monto_haber > 0)
    .map((item) => ({
      cuenta: item.cuenta,
      descripcion: item.descripcion,
      monto_debe: 0,
      monto_haber: item.monto_haber,
    }));

  return [...cuentasDebe, ...cuentasHaber];
};

export const LibroDiarioDetallePDF: React.FC<Props> = ({ searchParams }) => {
  const dateParam: string = searchParams?.date ?? "";
  const empresaParam: string = searchParams?.empresa ?? "0";

  const empresaId = Number(empresaParam) || 0;

  const fechaParaTitulo = dateParam
    ? dateParam.length === 7
      ? `${dateParam}-01`
      : dateParam
    : "";

  const formatedDate = fechaParaTitulo
    ? moment(fechaParaTitulo, "YYYY-MM-DD").locale("es").format("MMMM YYYY")
    : "";

  const [asientos, setAsientos] = useState<IGetAsientoContable[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [empresaInfo, setEmpresaInfo] = useState<any>({
    id: 0,
    nombre_empresa: "",
    nit: "",
    razon_social: "",
    direccion_fiscal: "",
  });
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [renderingPdf, setRenderingPdf] = useState(false);

  useEffect(() => {
    const getData = async () => {
      try {
        if (!empresaId || !dateParam) {
          setAsientos([]);
          setCuentas([]);
          setEmpresaInfo({});
          setLoading(false);
          return;
        }

        const [empresaResp, asientosResp, cuentasResp] = await Promise.all([
          obtenerEmpresa(empresaId),
          obtenerAsientosLDiario(empresaId, dateParam),
          obtenerCuentasByEmpresa(empresaId),
        ]);

        const empresaAny: any = empresaResp ?? {};
        const statusEmpresa = empresaAny.status ?? (empresaAny.ok ? 200 : 500);
        const messageEmpresa = empresaAny.message ?? empresaAny.error ?? "";
        const dataEmpresa = empresaAny.data;

        const asientosAny: any = asientosResp ?? {};
        const statusAsientos =
          asientosAny.status ?? (asientosAny.ok ? 200 : 500);
        const messageAsientos = asientosAny.message ?? asientosAny.error ?? "";
        const dataAsientos: IGetAsientoContable[] = asientosAny.data ?? [];

        const cuentasAny: any = cuentasResp ?? {};
        const statusCuentas =
          cuentasAny.status ?? (cuentasAny.ok ? 200 : 500);
        const messageCuentas = cuentasAny.message ?? cuentasAny.error ?? "";
        const dataCuentas: Cuenta[] = cuentasAny.data ?? [];

        if (statusEmpresa === 200 && dataEmpresa) {
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
          });
        } else {
          console.error("Error al obtener empresa Libro Diario Detalle", {
            statusEmpresa,
            messageEmpresa,
          });
          setEmpresaInfo({});
        }

        if (statusAsientos === 200) {
          setAsientos(dataAsientos);
        } else {
          console.error("Error al obtener asientos Libro Diario Detalle", {
            statusAsientos,
            messageAsientos,
          });
          setAsientos([]);
        }

        if (statusCuentas === 200) {
          setCuentas(dataCuentas);
        } else {
          console.error("Error al obtener cuentas Libro Diario Detalle", {
            statusCuentas,
            messageCuentas,
          });
          setCuentas([]);
        }
      } catch (error) {
        console.error("ERROR en getData LibroDiarioDetallePDF:", error);
        setAsientos([]);
        setCuentas([]);
        setEmpresaInfo({});
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [empresaId, dateParam]);

  const cuentasPrincipales = useMemo(
    () => cuentas.filter((cuenta) => Number(cuenta.nivel) === 3),
    [cuentas]
  );

  const cuentasParsed = useMemo(
    () => buildResumen(cuentasPrincipales, asientos),
    [cuentasPrincipales, asientos]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cuentasPerPage = 45;
    const pageCount = Math.ceil(cuentasParsed.length / cuentasPerPage);

    localStorage.setItem(
      "foliosUsed",
      JSON.stringify({
        libro: "12",
        foliosUsed: cuentasParsed.length === 0 ? 1 : pageCount,
        uuid: uuid(),
      })
    );
  }, [cuentasParsed.length]);

  const renderCuenta = (item: CuentaResumen, index: number) => {
    const debe = item.monto_debe > 0 ? parseMonto(item.monto_debe) : null;
    const haber = item.monto_haber > 0 ? parseMonto(item.monto_haber) : null;

    return (
      <View style={styles.rowsVariant} key={index}>
        <Text
          style={[
            styles.rowVariant,
            { width: "10%", textAlign: "right", paddingRight: 5 },
          ]}
        >
          {item.cuenta}
        </Text>
        <Text style={[styles.rowVariant, { width: "50%" }]}>
          {item.descripcion}
        </Text>
        <Text
          style={[
            styles.rowVariant,
            { width: "20%", textAlign: "right", paddingRight: 5 },
          ]}
        >
          {debe}
        </Text>
        <Text
          style={[
            styles.rowVariant,
            { width: "20%", textAlign: "right", paddingRight: 5 },
          ]}
        >
          {haber}
        </Text>
      </View>
    );
  };

  const renderEncabezado = (page: number) => (
    <View style={[styles.header, styles.flexColumn]}>
      <View style={styles.flexCenter}>
        <Text style={[styles.title, styles.blue, { marginBottom: 1 }]}>
          LIBRO DIARIO
        </Text>
        <Text style={{ fontSize: 12 }}>
          PERIODO FISCAL {new Date().getFullYear()}
        </Text>
      </View>
      <View style={styles.displayFlex}>
        <View style={[styles.flexColumn, { marginTop: 8, marginBottom: 8 }]}>
          <Text style={{ fontSize: 10 }}>
            Nombre Comercial:{" "}
            {empresaInfo.nombre_empresa ?? empresaInfo.nombre ?? ""}
          </Text>
          <Text style={{ fontSize: 10 }}>
            Razón Social:{" "}
            {empresaInfo.razon_social ?? empresaInfo.razonSocial ?? ""}
          </Text>
          <Text style={{ fontSize: 10 }}>NIT: {empresaInfo.nit ?? ""}</Text>
          <Text style={{ fontSize: 10 }}>
            Dirección:{" "}
            {empresaInfo.direccion_fiscal ?? empresaInfo.direccionFiscal ?? ""}
          </Text>
        </View>
        <View>
          <Text
            style={[
              { fontSize: 10, textTransform: "capitalize" as const },
              styles.blue,
            ]}
          >
            Página: {page + 1}
          </Text>
          <Text
            style={[
              { fontSize: 10, textTransform: "capitalize" as const },
            ]}
          >
            Fecha: {formatedDate}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderTableHead = () => (
    <View style={styles.tableHeadVariant} fixed>
      <Text style={[styles.columnDiario, { width: "10%", paddingLeft: 5 }]}>
        Cuenta
      </Text>
      <Text style={[styles.columnDiario, { width: "50%" }]}>
        Nombre de la Cuenta
      </Text>
      <Text style={[styles.columnDiario, { width: "20%" }]}>DEBE</Text>
      <Text style={[styles.columnDiario, { width: "20%" }]}>HABER</Text>
    </View>
  );

  const renderCuentas = (items: CuentaResumen[]) =>
    items.map((cuenta, index) => renderCuenta(cuenta, index));

  const renderPages = () => {
    const cuentasPerPage = 45;

    if (asientos.length === 0) {
      return [
        <EmptyPage
          key="empty"
          message="No se encontraron movimientos en las cuentas para esta empresa en esa fecha"
        />,
      ];
    }

    if (cuentas.length === 0) {
      return [
        <EmptyPage
          key="no-cuentas"
          message="No se pudieron obtener las cuentas de esta empresa"
        />,
      ];
    }

    if (cuentasParsed.length === 0) {
      return [
        <EmptyPage
          key="no-movimientos"
          message="No se encontraron movimientos en las cuentas para esta empresa en esa fecha"
        />,
      ];
    }

    const pageCount = Math.ceil(cuentasParsed.length / cuentasPerPage);
    const pages: React.ReactElement[] = [];

    for (let index = 0; index < pageCount; index++) {
      const startIndex = index * cuentasPerPage;
      const endIndex = Math.min(startIndex + cuentasPerPage, cuentasParsed.length);
      const cuentasPage = cuentasParsed.slice(startIndex, endIndex);

      pages.push(
        <Page
          size="LETTER"
          style={styles.page}
          orientation="portrait"
          key={index}
        >
          {renderEncabezado(index)}
          {renderTableHead()}
          <View style={[styles.tableBody, { marginVertical: 5 }]}>
            {renderCuentas(cuentasPage)}
          </View>
        </Page>
      );
    }

    return pages;
  };

  const documentTitle = `Libro Diario Detalle - ${
    empresaInfo.nombre_empresa ?? empresaInfo.nombre ?? ""
  } (${empresaInfo.nit ?? ""}) | ${formatedDate}`;

  const pdfPages = useMemo(() => {
    if (loading) {
      return <LoadingDocumentPDF />;
    }
    return renderPages();
  }, [loading, cuentasParsed, cuentas, asientos]);

  const pdfDocument = useMemo(
    () => <Document title={documentTitle}>{pdfPages}</Document>,
    [documentTitle, pdfPages]
  );

  useEffect(() => {
    if (loading) {
      setPdfUrl(null);
      setPdfError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const buildPdf = async () => {
      try {
        setRenderingPdf(true);
        setPdfError(null);
        setPdfUrl(null);
        const blob = await pdf(pdfDocument).toBlob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (error) {
        console.error("LibroDiarioDetallePDF PDF render error:", error);
        if (!cancelled) {
          setPdfUrl(null);
          setPdfError("No se pudo generar el PDF.");
        }
      } finally {
        if (!cancelled) {
          setRenderingPdf(false);
        }
      }
    };

    buildPdf();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [loading, pdfDocument]);

  if (loading || renderingPdf) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <PDFLoader />
      </div>
    );
  }

  if (pdfError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-red-600">
        {pdfError}
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <PDFLoader />
      </div>
    );
  }

  return (
    <iframe
      className="h-screen w-screen"
      title={documentTitle}
      src={pdfUrl}
    />
  );
};
