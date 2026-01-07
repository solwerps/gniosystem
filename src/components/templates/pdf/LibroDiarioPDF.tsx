// src/components/templates/pdf/LibroDiarioPDF.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Document, Page, Text, View, PDFViewer } from "@react-pdf/renderer";
import moment from "moment";
import "moment/locale/es";
import { v4 as uuid } from "uuid";

import { PDFLoader } from "@/components/atoms/loaders/PDFLoader";
import { styles } from "@/components/templates/pdf/style";

import type { IGetAsientoContable } from "@/utils";
import { parseDate, parseMonto } from "@/utils";
import { obtenerEmpresa } from "@/utils/services/empresas";
import { obtenerAsientosLDiario } from "@/utils/services/libros";

type LibroDiarioPDFProps = {
  searchParams: any;
};

// IGetAsientoContable + número de partida dentro del libro (1..N)
type AsientoConNumero = IGetAsientoContable & {
  numeroPdaLibro: number;
};

export const LibroDiarioPDF: React.FC<LibroDiarioPDFProps> = ({
  searchParams,
}) => {
  /* =========================
   * Query params
   * ========================= */
  const dateParam: string = searchParams?.date ?? "";
  const empresaParam: string = searchParams?.empresa ?? "0";
  const folioParam: string = searchParams?.folio ?? "0";
  const ordenParam: string = searchParams?.orden ?? "ascendente";

  const empresaId = Number(empresaParam) || 0;

  const ordenNormalizado: "ascendente" | "descendente" =
    typeof ordenParam === "string" &&
    ordenParam.toLowerCase().startsWith("desc")
      ? "descendente"
      : "ascendente";

  // Para el título: si viene "YYYY-MM", le agregamos "-01"
  const fechaParaTitulo = dateParam
    ? dateParam.length === 7
      ? `${dateParam}-01`
      : dateParam
    : "";

  const formatedDate = fechaParaTitulo
    ? moment(fechaParaTitulo, "YYYY-MM-DD").locale("es").format("MMMM YYYY")
    : "";

  /* =========================
   * Estados
   * ========================= */
  const [asientos, setAsientos] = useState<IGetAsientoContable[]>([]);
  const [empresaInfo, setEmpresaInfo] = useState<any>({
    id: 0,
    nombre_empresa: "",
    nit: "",
    razon_social: "",
    direccion_fiscal: "",
  });
  const [loading, setLoading] = useState(true);

  /* =========================
   * Carga de datos
   * ========================= */
  useEffect(() => {
    const getData = async () => {
      try {
        if (!empresaId || !dateParam) {
          setAsientos([]);
          setEmpresaInfo({});
          setLoading(false);
          return;
        }

        const [empresaResp, asientosResp] = await Promise.all([
          obtenerEmpresa(empresaId),
          obtenerAsientosLDiario(empresaId, dateParam, ordenNormalizado),
        ]);

        // Empresa
        const empresaAny: any = empresaResp ?? {};
        const statusEmpresa = empresaAny.status ?? (empresaAny.ok ? 200 : 500);
        const messageEmpresa = empresaAny.message ?? empresaAny.error ?? "";
        const dataEmpresa = empresaAny.data;

        // Asientos
        const asientosAny: any = asientosResp ?? {};
        const statusAsientos =
          asientosAny.status ?? (asientosAny.ok ? 200 : 500);
        const messageAsientos = asientosAny.message ?? asientosAny.error ?? "";
        const dataAsientos: IGetAsientoContable[] = asientosAny.data ?? [];

        if (statusEmpresa === 200 && statusAsientos === 200 && dataEmpresa) {
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

          setAsientos(dataAsientos ?? []);
        } else {
          console.error("Error al obtener datos Libro Diario", {
            statusEmpresa,
            messageEmpresa,
            statusAsientos,
            messageAsientos,
          });
          setEmpresaInfo({});
          setAsientos([]);
        }
      } catch (error) {
        console.error("ERROR en getData LibroDiarioPDF:", error);
        setEmpresaInfo({});
        setAsientos([]);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [empresaId, dateParam, ordenNormalizado]);

  /* =========================
   * Folios usados (libro 3)
   * ========================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const maxLinesPerPage = 30;
    const footerLines = 2;
    const usableLines = Math.max(1, maxLinesPerPage - footerLines);

    if (asientos.length === 0) {
      localStorage.setItem(
        "foliosUsed",
        JSON.stringify({
          libro: "3",
          foliosUsed: 1,
          uuid: uuid(),
        })
      );
      return;
    }

    let currentLines = 0;
    let pageIndex = 0;

    asientos.forEach((asiento) => {
      const asientoLines = 2 + (asiento.partidas?.length ?? 0);
      if (currentLines + asientoLines > usableLines) {
        pageIndex++;
        currentLines = 0;
      }
      currentLines += asientoLines;
    });

    const foliosUsed = pageIndex + 1;

    localStorage.setItem(
      "foliosUsed",
      JSON.stringify({
        libro: "3",
        foliosUsed,
        uuid: uuid(),
      })
    );
  }, [asientos]);

  /* =========================
   * Renumerar Pda dentro del libro
   * ========================= */
  const asientosConNumero: AsientoConNumero[] = asientos.map((a, index) => ({
    ...a,
    numeroPdaLibro: index + 1, // Pda 1..N para el libro
  }));

  /* =========================
   * Render helpers
   * ========================= */

  const renderPartida = (partida: any, index: number) => {
    const { monto_debe, monto_haber, cuenta, descripcion } = partida;

    const debeValor = Number(monto_debe ?? 0);
    const haberValor = Number(monto_haber ?? 0);

    const debe =
      debeValor === 0 ? null : parseMonto(debeValor);
    const haber =
      haberValor === 0 ? null : parseMonto(haberValor);

    return (
      <View style={styles.rowsVariant} key={index}>
        <Text style={[styles.rowVariant, { width: "20%" }]} />
        <Text style={[styles.rowVariant, { width: "20%" }]}>{cuenta}</Text>
        <Text style={[styles.rowVariant, { width: "30%" }]}>{descripcion}</Text>
        <Text
          style={[
            styles.rowVariant,
            { width: "15%", textAlign: "right" as const },
          ]}
        >
          {debe}
        </Text>
        <Text
          style={[
            styles.rowVariant,
            { width: "15%", textAlign: "right" as const },
          ]}
        >
          {haber}
        </Text>
      </View>
    );
  };

  const renderEncabezado = (page: number) => (
    <View style={[styles.header, styles.flexColumn]}>
      <View style={{ width: "100%", position: "absolute" as const }}>
        <Text style={{ fontSize: 8, textAlign: "right" as const }}>
          Folio: {parseFloat(folioParam) + page}
        </Text>
      </View>
      <View style={styles.flexCenter}>
        <Text style={[styles.title, styles.blue, { marginBottom: 1 }]}>
          LIBRO DIARIO
        </Text>
        <Text
          style={{
            fontSize: 12,
            textTransform: "uppercase" as const,
          }}
        >
          {formatedDate}
        </Text>
      </View>
      <View style={styles.displayFlex}>
        <View
          style={[styles.flexColumn, { marginTop: 8, marginBottom: 8 }]}
        >
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
          <Text style={{ fontSize: 10 }}>Fecha: {formatedDate}</Text>
        </View>
      </View>
    </View>
  );

  const renderTableHead = () => (
    <View style={styles.tableHeadVariant} fixed>
      <Text style={[styles.columnDiario, { width: "20%" }]}>Fecha</Text>
      <Text style={[styles.columnDiario, { width: "20%" }]}>Cuenta</Text>
      <Text style={[styles.columnDiario, { width: "30%" }]}>
        Nombre de la Cuenta
      </Text>
      <Text style={[styles.columnDiario, { width: "15%" }]}>DEBE</Text>
      <Text style={[styles.columnDiario, { width: "15%" }]}>HABER</Text>
    </View>
  );

  const renderAsientos = (lista: AsientoConNumero[]) =>
    lista.map((asiento, key) => {
      const partidasOrdenadas = [...asiento.partidas].sort((a, b) => {
        const aDebe = Number(a.monto_debe ?? 0);
        const bDebe = Number(b.monto_debe ?? 0);
        const aHaber = Number(a.monto_haber ?? 0);
        const bHaber = Number(b.monto_haber ?? 0);

        if (aDebe > 0 && bDebe === 0) return -1;
        if (aHaber > 0 && bHaber === 0) return 1;
        return 0;
      });

      const { totalDebe, totalHaber } = asiento.partidas.reduce(
        (acc, partida) => {
          const debe = Number(partida.monto_debe ?? 0);
          const haber = Number(partida.monto_haber ?? 0);

          acc.totalDebe += Number.isNaN(debe) ? 0 : debe;
          acc.totalHaber += Number.isNaN(haber) ? 0 : haber;
          return acc;
        },
        { totalDebe: 0, totalHaber: 0 }
      );

      return (
        <View
          style={[styles.tableBody, { marginVertical: 5 }]}
          key={String((asiento as any).asiento_id ?? key)}
        >
          <View
            style={[
              styles.rowsVariant,
              { marginBottom: 10, color: "#999999" },
            ]}
          >
            <Text style={[styles.rowVariant, { width: "20%" }]}>
              {parseDate(asiento.fecha)}
            </Text>
            <Text
              style={[
                styles.rowVariant,
                { width: "80%", textAlign: "center" as const },
              ]}
            >{`Pda No. ${asiento.numeroPdaLibro}`}</Text>
          </View>
          {partidasOrdenadas.map((partida, index) =>
            renderPartida(partida, index)
          )}
          <View style={styles.rowsVariant}>
            <Text
              style={[
                styles.rowVariant,
                {
                  width: "70%",
                  color: "#999999",
                  borderBottom: "1px solid #CCC",
                },
              ]}
            >
              {asiento.descripcion}
            </Text>
            <Text style={[styles.rowVariant, styles.totalColumnStyle]}>
              {parseMonto(totalDebe)}
            </Text>
            <Text style={[styles.rowVariant, styles.totalColumnStyle]}>
              {parseMonto(totalHaber)}
            </Text>
          </View>
        </View>
      );
    });

  const renderPages = (): React.ReactElement[] => {
    const maxLinesPerPage = 30;
    const footerLines = 2;
    const usableLines = Math.max(1, maxLinesPerPage - footerLines);
    const pages: React.ReactElement[] = [];

    if (asientosConNumero.length === 0) {
      return [
        <Page
          key="empty"
          size="LETTER"
          style={styles.page}
          orientation="portrait"
        >
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

    let currentPageAsientos: AsientoConNumero[] = [];
    let currentLines = 0;
    let pageIndex = 0;

    for (let index = 0; index < asientosConNumero.length; index++) {
      const asiento = asientosConNumero[index];
      const asientoLines = 2 + asiento.partidas.length;

      if (currentLines + asientoLines > usableLines) {
        pages.push(
          <Page
            size="LETTER"
            style={styles.page}
            orientation="portrait"
            key={pageIndex}
          >
            {renderEncabezado(pageIndex)}
            {renderTableHead()}
            <View style={styles.tableBody}>
              {renderAsientos(currentPageAsientos)}
            </View>
          </Page>
        );
        currentPageAsientos = [];
        currentLines = 0;
        pageIndex++;
      }

      currentPageAsientos.push(asiento);
      currentLines += asientoLines;
    }

    if (currentPageAsientos.length > 0) {
      pages.push(
        <Page
          size="LETTER"
          style={styles.page}
          orientation="portrait"
          key={pageIndex}
        >
          {renderEncabezado(pageIndex)}
          {renderTableHead()}
          <View style={styles.tableBody}>
            {renderAsientos(currentPageAsientos)}
          </View>
        </Page>
      );
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
        title={`Libro Diario ${
          empresaInfo.nombre_empresa ?? empresaInfo.nombre ?? ""
        } (${empresaInfo.nit ?? ""}) - ${formatedDate}`}
      >
        {renderPages()}
      </Document>
    </PDFViewer>
  );
};
