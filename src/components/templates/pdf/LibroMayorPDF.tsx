// src/components/templates/pdf/LibroMayorPDF.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import moment from "moment";
import "moment/locale/es";

import { PDFLoader } from "@/components/atoms/loaders/PDFLoader";
import { styles } from "@/components/templates/pdf/style";

import { parseMonto } from "@/utils";
import type { Cuenta, IGetAsientoContable } from "@/utils";
import { obtenerEmpresa } from "@/utils/services/empresas";
import { obtenerAsientosLDiario } from "@/utils/services/libros";
import { obtenerCuentasByEmpresa } from "@/utils/services/nomenclatura";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <PDFLoader />,
  }
);

type CuentaAgrupada = {
  cuentaId: number;
  cuenta: string | null;
  descripcion: string | null;
  naturaleza: string | null;
  partidas: {
    uuid: string;
    fecha: Date;
    descripcion: string | null;
    debe: number;
    haber: number;
    saldo: number;
    ordenAsiento: number;
    ordenPartida: number;
  }[];
};

type Props = { searchParams: any };

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  const parsed = Number.parseFloat(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parseCuentaCodigo = (codigo: string | null): number[] => {
  if (!codigo) return [];
  const matches = codigo.match(/\d+/g);
  if (!matches) return [];
  return matches.map((part) => Number(part));
};

const compareCuentaCodigo = (a: string | null, b: string | null): number => {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const partsA = parseCuentaCodigo(a);
  const partsB = parseCuentaCodigo(b);

  if (partsA.length === 0 && partsB.length === 0) {
    return a.localeCompare(b, "es", { numeric: true });
  }
  if (partsA.length === 0) return 1;
  if (partsB.length === 0) return -1;

  const minLen = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < minLen; i += 1) {
    if (partsA[i] !== partsB[i]) return partsA[i] - partsB[i];
  }

  if (partsA.length !== partsB.length) {
    return partsA.length - partsB.length;
  }

  return a.localeCompare(b, "es", { numeric: true });
};

export const LibroMayorPDF: React.FC<Props> = ({ searchParams }) => {
  const dateParam: string = searchParams?.date ?? "";
  const empresaParam: string = searchParams?.empresa ?? "0";

  const empresaId = Number(empresaParam) || 0;
  const orden: "ascendente" = "ascendente";

  const formatedDate = dateParam
    ? moment(dateParam.length === 7 ? `${dateParam}-01` : dateParam)
        .locale("es")
        .format("MMMM YYYY")
    : "";
  const fiscalYear = dateParam
    ? moment(dateParam.length === 7 ? `${dateParam}-01` : dateParam).format("YYYY")
    : String(new Date().getFullYear());

  const [asientos, setAsientos] = useState<IGetAsientoContable[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [empresaInfo, setEmpresaInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
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
          obtenerAsientosLDiario(empresaId, dateParam, orden),
          obtenerCuentasByEmpresa(empresaId),
        ]);

        // Empresa
        const empresaAny: any = empresaResp ?? {};
        const statusEmpresa = empresaAny.status ?? (empresaAny.ok ? 200 : 500);
        const dataEmpresa = empresaAny.data;

        // Asientos contables
        const asientosAny: any = asientosResp ?? {};
        const statusAsientos =
          asientosAny.status ?? (asientosAny.ok ? 200 : 500);
        const dataAsientos: IGetAsientoContable[] = asientosAny.data ?? [];

        // Cuentas contables
        const cuentasAny: any = cuentasResp ?? {};
        const statusCuentas =
          cuentasAny.status ?? (cuentasAny.ok ? 200 : 500);
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
            razon_social:
              dataEmpresa.razon_social ?? dataEmpresa.razonSocial ?? "",
            nit: dataEmpresa.nit ?? "",
            direccion_fiscal: direccion,
          });
        } else {
          setEmpresaInfo({});
        }

        if (statusAsientos === 200) {
          setAsientos(dataAsientos);
        } else {
          setAsientos([]);
        }

        if (statusCuentas === 200) {
          setCuentas(dataCuentas);
        } else {
          setCuentas([]);
        }
      } catch (err) {
        console.error("LibroMayorPDF load error:", err);
        setAsientos([]);
        setCuentas([]);
        setEmpresaInfo({});
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [empresaId, dateParam, orden]);

  const cuentasAgrupadas: CuentaAgrupada[] = useMemo(() => {
    const map = new Map<number, CuentaAgrupada>();
    const cuentasById = new Map<number, Cuenta>();
    cuentas.forEach((cuenta) => {
      cuentasById.set(cuenta.id, cuenta);
    });

    asientos.forEach((asiento, asientoIndex) => {
      const partidas = Array.isArray(asiento.partidas) ? asiento.partidas : [];
      partidas.forEach((partida, partidaIndex) => {
        const cuentaId = partida.cuenta_id;
        if (!cuentaId) return;

        if (!map.has(cuentaId)) {
          const cuentaInfo = cuentasById.get(cuentaId);
          map.set(cuentaId, {
            cuentaId,
            cuenta: partida.cuenta ?? cuentaInfo?.cuenta ?? null,
            descripcion: partida.descripcion ?? cuentaInfo?.descripcion ?? null,
            naturaleza: cuentaInfo?.naturaleza ?? null,
            partidas: [],
          });
        }

        const grupo = map.get(cuentaId)!;
        grupo.partidas.push({
          uuid: partida.uuid,
          fecha: asiento.fecha ? new Date(asiento.fecha) : new Date(),
          descripcion: asiento.descripcion ?? null,
          debe: toNumber(partida.monto_debe),
          haber: toNumber(partida.monto_haber),
          saldo: 0,
          ordenAsiento: asientoIndex,
          ordenPartida: partidaIndex,
        });
      });
    });

    // Calcular saldo por naturaleza
    map.forEach((g) => {
      g.partidas.sort((a, b) => {
        const diffFecha = a.fecha.getTime() - b.fecha.getTime();
        if (diffFecha !== 0) return diffFecha;
        if (a.ordenAsiento !== b.ordenAsiento) {
          return a.ordenAsiento - b.ordenAsiento;
        }
        if (a.ordenPartida !== b.ordenPartida) {
          return a.ordenPartida - b.ordenPartida;
        }
        return a.uuid.localeCompare(b.uuid);
      });

      let saldo = 0;
      const nat = (g.naturaleza || "").toUpperCase();
      const esDeudora = ["ACTIVO", "COSTOS", "GASTOS"].includes(nat);

      g.partidas.forEach((part) => {
        saldo += esDeudora ? part.debe - part.haber : part.haber - part.debe;
        part.saldo = saldo;
      });
    });

    const cuentasOrdenadas = [...cuentas].sort((a, b) =>
      compareCuentaCodigo(a.cuenta, b.cuenta)
    );

    const result: CuentaAgrupada[] = [];
    cuentasOrdenadas.forEach((cuenta) => {
      const grupo = map.get(cuenta.id);
      if (!grupo) return;
      grupo.cuenta = cuenta.cuenta ?? grupo.cuenta ?? null;
      grupo.descripcion = cuenta.descripcion ?? grupo.descripcion ?? null;
      grupo.naturaleza = cuenta.naturaleza ?? grupo.naturaleza ?? null;
      result.push(grupo);
    });

    return result;
  }, [asientos, cuentas]);

  const renderEncabezado = (page: number) => (
    <View style={[styles.header, styles.flexColumn]}>
      <View style={styles.flexCenter}>
        <Text style={[styles.title, styles.blue, { marginBottom: 1 }]}>
          LIBRO MAYOR
        </Text>
        <Text style={{ fontSize: 12 }}>PERIODO FISCAL {fiscalYear}</Text>
      </View>
      <View style={styles.displayFlex}>
        <View style={[styles.flexColumn, { marginTop: 8, marginBottom: 8 }]}>
          <Text style={{ fontSize: 10 }}>
            Nombre Comercial: {empresaInfo.nombre_empresa ?? ""}
          </Text>
          <Text style={{ fontSize: 10 }}>
            Razón Social: {empresaInfo.razon_social ?? ""}
          </Text>
          <Text style={{ fontSize: 10 }}>NIT: {empresaInfo.nit ?? ""}</Text>
          <Text style={{ fontSize: 10 }}>
            Dirección: {empresaInfo.direccion_fiscal ?? ""}
          </Text>
        </View>
        <View>
          <Text
            style={[
              { fontSize: 7, textTransform: "capitalize", textAlign: "right" },
              styles.blue,
            ]}
          >
            Página: {page + 1}
          </Text>
          <Text style={{ fontSize: 7, textAlign: "right" }}>
            Fecha: {formatedDate}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderTableHead = () => (
    <View style={styles.tableHeadVariant} fixed>
      <Text style={[styles.columnDiario, { width: "15%", textAlign: "left" }]}>
        Fecha
      </Text>
      <Text style={[styles.columnDiario, { width: "40%", textAlign: "left" }]}>
        Descripcion
      </Text>
      <Text style={[styles.columnDiario, { width: "15%", textAlign: "center" }]}>
        DEBE
      </Text>
      <Text style={[styles.columnDiario, { width: "15%", textAlign: "center" }]}>
        HABER
      </Text>
      <Text style={[styles.columnDiario, { width: "15%", textAlign: "center" }]}>
        SALDO
      </Text>
    </View>
  );

  const renderCuentaHeader = (cuenta: CuentaAgrupada) => (
    <View
      style={[styles.rowsVariant, { marginBottom: 5 }]}
      key={`c-${cuenta.cuentaId}`}
    >
      <Text style={[styles.rowVariant, styles.bold, { width: "15%" }]}>
        {cuenta.cuenta}
      </Text>
      <Text style={[styles.rowVariant, styles.bold, { width: "40%" }]}>
        {cuenta.descripcion}
      </Text>
      <Text style={[styles.rowVariant, { width: "45%" }]} />
    </View>
  );

  const renderPartida = (partida: any, isLast: boolean, idx: number) => (
    <View
      style={[
        styles.rowsVariant,
        {
          marginBottom: isLast ? 8 : 5,
          borderBottom: isLast ? "1px solid black" : 0,
        },
      ]}
      key={`${partida.uuid ?? "uuid"}-${idx}`}
    >
      <Text style={[styles.rowVariant, { width: "15%" }]}>
        {moment(partida.fecha).format("DD/MM/YYYY")}
      </Text>
      <Text style={[styles.rowVariant, { width: "40%" }]}>
        {partida.descripcion}
      </Text>
      <Text style={[styles.rowVariant, { width: "15%", textAlign: "right" }]}>
        {partida.debe > 0 ? parseMonto(partida.debe) : null}
      </Text>
      <Text style={[styles.rowVariant, { width: "15%", textAlign: "right" }]}>
        {partida.haber > 0 ? parseMonto(partida.haber) : null}
      </Text>
      <Text style={[styles.rowVariant, { width: "15%", textAlign: "right" }]}>
        {parseMonto(partida.saldo)}
      </Text>
    </View>
  );

  const renderPages = () => {
    if (cuentasAgrupadas.length === 0) {
      return [
        <Page key="empty" size="LETTER" style={styles.page} orientation="portrait">
          {renderEncabezado(0)}
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
        </Page>,
      ];
    }

    const pages: React.ReactElement[] = [];
    const maxLinesPerPage = 34;
    const footerLines = 2;
    const usableLines = Math.max(1, maxLinesPerPage - footerLines);
    let current: React.ReactElement[] = [];
    let lineCount = 0;
    const pushPage = () => {
      pages.push(
        <Page key={pages.length} size="LETTER" style={styles.page} orientation="portrait">
          {renderEncabezado(pages.length)}
          {renderTableHead()}
          {current}
        </Page>
      );
      current = [];
      lineCount = 0;
    };

    cuentasAgrupadas.forEach((cuenta) => {
      const partidas = cuenta.partidas ?? [];
      const minLinesForCuenta = partidas.length > 0 ? 2 : 1;

      // Header de cuenta (evita dejarlo solo al final de la hoja)
      if (lineCount + minLinesForCuenta > usableLines) pushPage();
      current.push(renderCuentaHeader(cuenta));
      lineCount += 1;

      partidas.forEach((p, idx) => {
        if (lineCount + 1 > usableLines) pushPage();
        current.push(renderPartida(p, idx === partidas.length - 1, idx));
        lineCount += 1;
      });
    });

    if (current.length > 0) pushPage();
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
        title={`Libro Mayor - ${empresaInfo.nombre_empresa ?? ""} (${empresaInfo.nit ?? ""}) | ${formatedDate}`}
      >
        {renderPages()}
      </Document>
    </PDFViewer>
  );
};
