// src/components/templates/pdf/BalanceGeneralPDF.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import "moment/locale/es";
import {
  Document,
  Page,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer/lib/react-pdf.browser";
import { v4 as uuid } from "uuid";

import { PDFLoader } from "@/components/atoms/loaders/PDFLoader";
import { EmptyPage } from "@/components/templates/pdf/EmptyPage";
import { LoadingDocumentPDF } from "@/components/templates/pdf/LoadingDocumentPDF";
import { styles } from "@/components/templates/pdf/style";

import type { Cuenta, CuentaTipo, IFact, IGetAsientoContable } from "@/utils";
import {
  obtenerAsientosBG,
  obtenerCuentasByEmpresa,
  obtenerDocumentosBG,
  obtenerEmpresa,
  parseMonto,
} from "@/utils";

interface CuentaBalance extends Cuenta {
  monto: number;
  total: number;
  total_section: number;
}

export const BalanceGeneralPDF = ({ searchParams }: { searchParams: any }) => {
  // Query Params
  const date1 = searchParams?.date1 ?? null;
  const date2 = searchParams?.date2 ?? null;
  const empresaParam = searchParams?.empresa ?? "0";
  const empresaId = Number(empresaParam) || 0;

  // Fecha
  const formatedDate = moment().locale("es").format("LL");
  const date1Formated = date1 ? moment(date1).locale("es").format("LL") : "";
  const date2Formated = date2 ? moment(date2).locale("es").format("LL") : "";

  // Estados
  const [data, setData] = useState({
    empresaInfo: { nombre_empresa: "", nit: "" },
    cuentas: [] as Cuenta[],
    asientos: [] as IGetAsientoContable[],
    documentos: [] as IFact[],
  });
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [renderingPdf, setRenderingPdf] = useState(false);

  useEffect(() => {
    const getData = async () => {
      try {
        if (!empresaId) {
          setData({
            empresaInfo: { nombre_empresa: "", nit: "" },
            cuentas: [],
            asientos: [],
            documentos: [],
          });
          setLoading(false);
          return;
        }

        const [
          empresaResponse,
          asientosResponse,
          cuentasResponse,
          docsResponse,
        ] = await Promise.all([
          obtenerEmpresa(empresaId),
          obtenerAsientosBG(empresaId, date1, date2),
          obtenerCuentasByEmpresa(empresaId),
          obtenerDocumentosBG(empresaId, date1, date2),
        ]);

        const empresaAny: any = empresaResponse ?? {};
        const statusEmpresa = empresaAny.status ?? (empresaAny.ok ? 200 : 500);
        const messageEmpresa = empresaAny.message ?? empresaAny.error ?? "";
        const dataEmpresa = empresaAny.data;

        const asientosAny: any = asientosResponse ?? {};
        const statusAsientos = asientosAny.status ?? (asientosAny.ok ? 200 : 500);
        const messageAsientos = asientosAny.message ?? asientosAny.error ?? "";
        const dataAsientos: IGetAsientoContable[] = asientosAny.data ?? [];

        const cuentasAny: any = cuentasResponse ?? {};
        const statusCuentas = cuentasAny.status ?? (cuentasAny.ok ? 200 : 500);
        const messageCuentas = cuentasAny.message ?? cuentasAny.error ?? "";
        const dataCuentas: Cuenta[] = cuentasAny.data ?? [];

        const docsAny: any = docsResponse ?? {};
        const statusDocs = docsAny.status ?? (docsAny.ok ? 200 : 500);
        const messageDocs = docsAny.message ?? docsAny.error ?? "";
        const dataDocs: IFact[] = docsAny.data ?? [];

        if (
          statusEmpresa === 200 &&
          statusAsientos === 200 &&
          statusCuentas === 200 &&
          statusDocs === 200
        ) {
          const direccion =
            (dataEmpresa?.infoJuridico as any)?.direccion ||
            (dataEmpresa?.infoIndividual as any)?.direccion ||
            dataEmpresa?.direccion_fiscal ||
            dataEmpresa?.direccionFiscal ||
            "";

          const empresaInfo = {
            ...dataEmpresa,
            nombre_empresa:
              dataEmpresa?.nombre_empresa ?? dataEmpresa?.nombre ?? "",
            razon_social:
              dataEmpresa?.razon_social ?? dataEmpresa?.razonSocial ?? "",
            direccion_fiscal: direccion,
          };

          setData({
            empresaInfo,
            asientos: dataAsientos,
            cuentas: dataCuentas,
            documentos: dataDocs,
          });
        } else {
          const message = `Error al obtener datos. Empresa: ${messageEmpresa}, Asientos: ${messageAsientos}, Cuentas: ${messageCuentas}, Docs: ${messageDocs}`;
          throw new Error(message);
        }
      } catch (error) {
        console.log({ error });
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [empresaId, date1, date2]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const foliosUsed =
      data.asientos.length > 0 && data.cuentas.length > 0 ? 3 : 1;

    localStorage.setItem(
      "foliosUsed",
      JSON.stringify({
        libro: "5",
        foliosUsed,
        uuid: uuid(),
      })
    );
  }, [data.asientos.length, data.cuentas.length]);

  const handleMontos = (asientos: IGetAsientoContable[], cuenta: number) => {
    const montosMensuales: string[] = Array(12).fill("---");

    asientos.forEach((asiento) => {
      const fecha = new Date(asiento.fecha);
      const mes = fecha.getMonth(); // Mes (0 = enero, 11 = diciembre)

      let sumaMes = 0;

      asiento.partidas.forEach((partida) => {
        if (partida.cuenta == cuenta) {
          sumaMes += partida.monto_debe + partida.monto_haber;
        }
      });

      // Si ya hay un valor en el mes, sumamos al existente
      if (montosMensuales[mes] !== "---") {
        const montoActual = parseFloat(montosMensuales[mes].replace(/,/g, ""));
        sumaMes += montoActual;
      }

      // Formatear el valor y actualizar el array
      const montoFormateado = parseFloat(sumaMes.toFixed(2)).toLocaleString(
        "es-MX"
      );
      montosMensuales[mes] = montoFormateado;
    });

    return montosMensuales;
  };

  const handleFacturasCantidad = (
    facturas: IFact[],
    tipo: "compra" | "venta",
    normales: boolean
  ) => {
    const facturasMensuales: string[] = Array(12).fill("---");

    facturas.forEach((fact) => {
      const fecha = new Date(fact.fecha_trabajo);
      const mes = fecha.getMonth(); // Mes (0 = enero, 11 = diciembre)

      if (
        fact.tipo_operacion === tipo &&
        (normales ? fact.tipo_dte !== "NCRE" : fact.tipo_dte === "NCRE")
      ) {
        if (facturasMensuales[mes] !== "---") {
          const cantidadActual = parseInt(facturasMensuales[mes], 10);
          facturasMensuales[mes] = (cantidadActual + 1).toString();
        } else {
          facturasMensuales[mes] = "1";
        }
      }
    });

    return facturasMensuales;
  };

  const renderBGTable = () => {
    // Definimos los datos de créditos y débitos
    const creditos = [
      { descripcion: "FPEQ", valores: handleMontos(data.asientos, 520238) },
      {
        descripcion: "Combustibles",
        valores: handleMontos(data.asientos, 520223),
      },
      { descripcion: "Compras", valores: handleMontos(data.asientos, 520240) },
      {
        descripcion: "Servicios Recibidos",
        valores: handleMontos(data.asientos, 520239),
      },
      {
        descripcion: "IVA por Cobrar",
        valores: handleMontos(data.asientos, 110401),
      },
      {
        descripcion: "Facturas recibidas",
        valores: handleFacturasCantidad(data.documentos, "compra", true),
      },
      {
        descripcion: "NCRE recibidas",
        valores: handleFacturasCantidad(data.documentos, "compra", false),
      },
    ];

    const debitos = [
      { descripcion: "Ventas", valores: handleMontos(data.asientos, 410101) },
      {
        descripcion: "Servicios Prestados",
        valores: handleMontos(data.asientos, 410102),
      },
      {
        descripcion: "IVA por Pagar",
        valores: handleMontos(data.asientos, 210201),
      },
      {
        descripcion: "Facturas emitidas",
        valores: handleFacturasCantidad(data.documentos, "venta", true),
      },
      {
        descripcion: "NCRE emitidas",
        valores: handleFacturasCantidad(data.documentos, "venta", false),
      },
    ];

    // Función para renderizar las filas de la tabla
    const renderRows = (
      rows: {
        descripcion: string;
        valores: string[];
      }[]
    ) => {
      return rows.map((item, index) => (
        <View style={styles.rows} key={index}>
          <Text style={[styles.column, { width: "30%" }]}>
            {item.descripcion}
          </Text>
          {item.valores.map((valor, mesIndex) => (
            <Text style={[styles.column, { width: "5.83%" }]} key={mesIndex}>
              {valor}
            </Text>
          ))}
        </View>
      ));
    };

    return (
      <View>
        <View style={styles.header}>
          <Text style={[styles.title, styles.blue]}>Resumen</Text>
        </View>

        <View style={styles.table}>
          {/* Cabecera de la tabla */}
          <View style={styles.tableHead}>
            <Text style={[styles.column, { width: "30%" }]}>Descripción</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Enero</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Febrero</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Marzo</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Abril</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Mayo</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Junio</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Julio</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Agosto</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>
              Septiembre
            </Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Octubre</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Noviembre</Text>
            <Text style={[styles.column, { width: "5.83%" }]}>Diciembre</Text>
          </View>

          {/* Filas de débitos */}
          <View style={styles.rowVienenVan}>
            <Text style={[styles.row, { width: "100%" }]}>DÉBITOS:</Text>
          </View>
          <View style={styles.tableBody}>{renderRows(debitos)}</View>

          {/* Filas de créditos */}
          <View style={styles.rowVienenVan}>
            <Text style={[styles.row, { width: "100%" }]}>CRÉDITOS:</Text>
          </View>
          <View style={styles.tableBody}>{renderRows(creditos)}</View>
        </View>
      </View>
    );
  };

  const renderEncabezado = (title: string) => {
    return (
      <View style={[styles.header, styles.flexColumn, { marginBottom: 5 }]}>
        <View style={styles.flexCenter}>
          <Text style={[styles.textlg, styles.bold, { marginBottom: 1 }]}>
            {data.empresaInfo.nombre_empresa ??
              data.empresaInfo.nombre ??
              ""}
          </Text>
          <Text style={[styles.textmd, styles.blue, { marginBottom: 1 }]}>
            {title}
          </Text>
          {!date1 && !date2 && (
            <Text style={{ fontSize: 10 }}>Al {formatedDate}</Text>
          )}
          {date1 && !date2 && (
            <Text style={{ fontSize: 10 }}>
              Desde {date1Formated} al {formatedDate}
            </Text>
          )}
          {date1 && date2 && (
            <Text style={{ fontSize: 10 }}>
              Desde {date1Formated} al {date2Formated}
            </Text>
          )}
          <Text style={{ fontSize: 10, textTransform: "capitalize" as const }}>
            (Expresado en Quetzales)
          </Text>
        </View>
      </View>
    );
  };

  const renderCuenta = (cuenta: CuentaBalance) => {
    const cuentaStyles: any = [
      styles.rowVariant,
      { width: "50%", textAlign: "left", paddingLeft: 5 },
    ];

    if (cuenta.nivel === 1) {
      cuentaStyles.push(styles.bold, { textDecoration: "underline" });
    }
    if (cuenta.nivel === 2) {
      cuentaStyles.push(styles.italic, { textDecoration: "underline" });
    }

    return (
      <View style={styles.rowsVariant} key={`${cuenta.id}-${cuenta.cuenta}`}>
        <Text style={cuentaStyles}>{cuenta.descripcion}</Text>
        <Text style={[styles.columnDiario, styles.right, { width: "16.66%" }]}>
          {cuenta.monto > 0 ? parseMonto(cuenta.monto) : null}
        </Text>
        <Text style={[styles.columnDiario, styles.right, { width: "16.66%" }]}>
          {cuenta.total > 0 ? parseMonto(cuenta.total) : null}
        </Text>
        <Text style={[styles.columnDiario, styles.right, { width: "16.66%" }]}>
          {cuenta.total_section > 0 ? parseMonto(cuenta.total_section) : null}
        </Text>
      </View>
    );
  };

  const obtenerCuentas = (tipos: CuentaTipo[]): CuentaBalance[] => {
    const cuentasList: any[] = data.cuentas.filter((cuenta) =>
      tipos.includes(cuenta.naturaleza as CuentaTipo)
    );
    const cuentasPrincipales: any[] = data.cuentas.filter(
      (cuenta) => cuenta.nivel === 1 || cuenta.nivel === 2
    );
    const cuentasPadres = new Set<any>();
    const cuentasUtilizadas = new Set<any>();

    const cuentaMontos: Record<any, { monto: number }> = {};

    data.asientos.forEach((asiento) => {
      // Setear las cuentas usadas y las hijas de nivel 3
      asiento.partidas.forEach((partida) => {
        if (partida.cuenta == null) {
          return;
        }
        const cuentaId = partida.cuenta;
        cuentasUtilizadas.add(cuentaId);

        if (!cuentaMontos[cuentaId]) {
          cuentaMontos[cuentaId] = { monto: 0 };
        }

        cuentaMontos[cuentaId].monto +=
          partida.monto_debe + partida.monto_haber;

        const cuentaHija = data.cuentas.find(
          (cuenta) =>
            cuenta.nivel === 3 &&
            cuentaId.toString().startsWith(cuenta.cuenta.toString())
        );

        if (cuentaHija) {
          cuentasPadres.add(cuentaHija.cuenta);
        }
      });
    });

    const cuentasFiltradas = cuentasList.filter(
      (cuenta) =>
        cuentasPrincipales.some((c) => c.cuenta === cuenta.cuenta) ||
        cuentasPadres.has(cuenta.cuenta) ||
        cuentasUtilizadas.has(cuenta.cuenta)
    );

    cuentasFiltradas.sort((a, b) => {
      const nivelA = a.cuenta.toString().padEnd(6, "0");
      const nivelB = b.cuenta.toString().padEnd(6, "0");
      return nivelA.localeCompare(nivelB);
    });

    const handleTotal = (cuenta: Cuenta): number => {
      const cuentasHijas = data.cuentas.filter((c) =>
        c.cuenta.toString().startsWith(cuenta.cuenta.toString())
      );
      return cuentasHijas.reduce(
        (acc, c) => acc + (cuentaMontos[c.cuenta]?.monto || 0),
        0
      );
    };

    const handleTotalSection = (cuenta: Cuenta): number => {
      const cuentasSeccion = data.cuentas.filter(
        (c) =>
          c.naturaleza === cuenta.naturaleza &&
          c.nivel > 1 &&
          c.cuenta.toString().startsWith(cuenta.cuenta.toString())
      );
      return cuentasSeccion.reduce(
        (acc, c) => acc + (cuentaMontos[c.cuenta]?.monto || 0),
        0
      );
    };

    const cuentasFormated = cuentasFiltradas.map((cuenta) => {
      const monto = cuentaMontos[cuenta.cuenta]
        ? cuentaMontos[cuenta.cuenta].monto
        : 0;
      const total = cuenta.nivel == 2 ? handleTotal(cuenta) : 0;
      const total_section =
        cuenta.nivel == 1 ? handleTotalSection(cuenta) : 0;

      return {
        ...cuenta,
        monto,
        total,
        total_section,
      };
    });

    return cuentasFormated;
  };

  const renderCuentas = (
    cuentas: CuentaBalance[],
    totalText: string,
    total: number
  ) => {
    const cuentaStyles: any = [
      styles.rowVariant,
      styles.right,
      { width: "50%", paddingRight: 5, paddingTop: 3 },
    ];

    return (
      <>
        {cuentas.map((cuenta) => renderCuenta(cuenta))}
        <View style={styles.rowsVariant}>
          <Text style={cuentaStyles}>{totalText}</Text>
          <View
            style={[
              styles.columnDiario,
              {
                width: "50%",
                borderTop: "1px black solid",
                paddingTop: 3,
                alignItems: "flex-end",
              },
            ]}
          >
            <Text
              style={[
                styles.columnDiario,
                styles.right,
                styles.bold,
                {
                  width: "33.33%",
                  paddingBottom: 2,
                },
              ]}
            >
              {total && total > 0 ? parseMonto(total) : null}
            </Text>
            <View
              style={{
                borderBottom: "0.7px black solid",
                marginBottom: 0.9,
                width: "33.33%",
              }}
            />
            <View
              style={{
                borderBottom: "0.7px black solid",
                width: "33.33%",
              }}
            />
          </View>
        </View>
      </>
    );
  };

  const renderCuentasBalance = () => {
    const cuentasActivo = obtenerCuentas(["ACTIVO"]);
    const cuentasPasivo = obtenerCuentas(["PASIVO", "CAPITAL"]);

    const totalActivo =
      cuentasActivo.find((cuenta) => cuenta.nivel === 1)?.total_section ?? 0;
    const totalPasivo =
      cuentasPasivo.find(
        (cuenta) => cuenta.nivel === 1 && String(cuenta.cuenta) === "2"
      )?.total_section ?? 0;
    const totalCapital =
      cuentasPasivo.find(
        (cuenta) => cuenta.nivel === 1 && String(cuenta.cuenta) === "3"
      )?.total_section ?? 0;
    const totalPasivoCapital = totalPasivo + totalCapital;

    return (
      <View style={styles.tableBody}>
        {renderCuentas(cuentasActivo, "TOTAL ACTIVO", totalActivo)}
        <View style={{ marginVertical: 6 }} />
        {renderCuentas(cuentasPasivo, "TOTAL PASIVO", totalPasivoCapital)}
      </View>
    );
  };

  const renderCuentasEstadoResultados = () => {
    const cuentasIngresos = obtenerCuentas(["INGRESOS"]);
    const cuentasCostos = obtenerCuentas(["COSTOS"]);

    const totalIngresos =
      cuentasIngresos.find(
        (cuenta) => cuenta.nivel === 1 && String(cuenta.cuenta) === "4"
      )?.total_section ?? 0;
    const totalCostos =
      cuentasCostos.find(
        (cuenta) => cuenta.nivel === 1 && String(cuenta.cuenta) === "5"
      )?.total_section ?? 0;

    return (
      <View style={styles.tableBody}>
        {renderCuentas(cuentasIngresos, "TOTAL INGRESOS", totalIngresos)}
        <View style={{ marginVertical: 6 }} />
        {renderCuentas(cuentasCostos, "TOTAL GASTOS", totalCostos)}
      </View>
    );
  };

  const renderPages = useCallback(() => {
    if (data.asientos.length === 0 || data.cuentas.length === 0) {
      return (
        <EmptyPage
          key="empty"
          message="No se encontraron asientos o cuentas para los criterios seleccionados."
        />
      );
    }

    const renderBalance = () => (
      <Page size="LETTER" style={styles.page} orientation="portrait" key="b1">
        {renderEncabezado("BALANCE GENERAL")}
        {renderCuentasBalance()}
      </Page>
    );

    const renderEstadoResultados = () => (
      <Page size="LETTER" style={styles.page} orientation="portrait" key="b2">
        {renderEncabezado("ESTADO DE RESULTADOS")}
        {renderCuentasEstadoResultados()}
      </Page>
    );

    const renderBGResumen = () => (
      <Page size="LETTER" style={styles.page} orientation="landscape" key="b3">
        {renderEncabezado("ESTADO DE RESULTADOS - Detalle por periodo")}
        {renderBGTable()}
      </Page>
    );

    return [renderBalance(), renderEstadoResultados(), renderBGResumen()];
  }, [data, date1, date2, date1Formated, date2Formated, formatedDate]);

  const documentTitle = `Balance General y Estado de Resultados ${
    data.empresaInfo.nombre_empresa ?? data.empresaInfo.nombre ?? ""
  } (${data.empresaInfo.nit ?? ""}) - ${formatedDate}`;

  const pdfPages = useMemo(() => {
    if (loading) {
      return <LoadingDocumentPDF />;
    }
    return renderPages();
  }, [loading, renderPages]);

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
        console.error("BalanceGeneralPDF render error:", error);
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
    <iframe className="h-screen w-screen" title={documentTitle} src={pdfUrl} />
  );
};
