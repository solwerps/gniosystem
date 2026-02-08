"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Document, Page, Text, View } from "@react-pdf/renderer";
import moment from "moment";
import "moment/locale/es";

import { PDFLoader } from "@/components/atoms";
import { EmptyPage } from "@/components/templates/pdf/EmptyPage";
import { LoadingDocumentPDF } from "@/components/templates/pdf/LoadingDocumentPDF";
import { styles } from "./style";
import { obtenerEmpresa, parseMonto } from "@/utils";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
            ssr: false,
            loading: () => <PDFLoader />
    }
);

export const IVAMensualPDF = ({ searchParams }: { searchParams: any }) => {
    // Query Params
    let date = searchParams.date ?? "";
    let empresa = searchParams.empresa ?? "0";
    const empresaId = Number(empresa) || 0;

    // Fecha
    let formatedDate = moment(date).locale("es").format("MMMM YYYY");

    // Estados
    const [loading, setLoading] = useState(true);
    const [empresaInfo, setEmpresaInfo] = useState({
        nombre: "",
        razonSocial: "",
        nit: "",
        direccion: "",
    });

    useEffect(() => {
        const getData = async () => {
            try {
                if (date && empresaId) {
                    const empresaResp = await obtenerEmpresa(empresaId);
                    const empresaAny: any = empresaResp ?? {};
                    const statusEmpresa =
                        empresaAny.status ?? (empresaAny.ok ? 200 : 500);
                    const messageEmpresa =
                        empresaAny.message ?? empresaAny.error ?? "";
                    const dataEmpresa = empresaAny.data;

                    if (statusEmpresa === 200 && dataEmpresa) {
                        const direccion =
                            dataEmpresa.infoJuridico?.direccion ||
                            dataEmpresa.infoIndividual?.direccion ||
                            dataEmpresa.direccion_fiscal ||
                            dataEmpresa.direccionFiscal ||
                            "";

                        setEmpresaInfo({
                            nombre: dataEmpresa.nombre ?? "",
                            razonSocial: dataEmpresa.razonSocial ?? "",
                            nit: dataEmpresa.nit ?? "",
                            direccion,
                        });
                    } else {
                        throw new Error(
                            `Error al obtener datos. Empresa: ${messageEmpresa}`
                        );
                    }
                }
            } catch (error) {
                console.log({ error });
            } finally {
                setLoading(false);
            }
        };
        getData();
    }, [date, empresaId]);

    const renderEncabezado = (page: number) => {
        return (
            <View style={[styles.header, styles.flexColumn]}>
                <View style={[styles.flexCenter]}>
                    <Text
                        style={[
                            styles.title,
                            styles.blue,
                            { fontSize: 9.5, marginTop: -8 }
                        ]}
                    >
                        Formaulario IVA Mensual
                    </Text>
                    <Text style={[{ fontSize: 8 }]}>
                        {formatedDate}
                    </Text>
                </View>
                <View style={[styles.displayFlex]}>
                    <View style={[styles.flexColumn]}>
                        <Text style={[{ fontSize: 7 }]}>
                            Nombre Comercial: {empresaInfo.nombre}
                        </Text>
                        <Text style={[{ fontSize: 7 }]}>
                            Razón Social: {empresaInfo.razonSocial}
                        </Text>
                        <Text style={[{ fontSize: 7 }]}>
                            NIT: {empresaInfo.nit}
                        </Text>
                        <Text style={[{ fontSize: 7 }]}>
                            Dirección: {empresaInfo.direccion}
                        </Text>
                    </View>

                    <View>
                        <Text
                            style={[
                                { fontSize: 7, textTransform: 'capitalize' },
                                styles.blue
                            ]}
                        >
                            Página: {page + 1}
                        </Text>
                        <Text style={[{ fontSize: 7 }]}>
                            Fecha: {formatedDate}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderPuntoTres = (debitos: any[]) => (
        <View>
            <Text style={[styles.textlg, styles.blue]}>3. Débito Fiscal por Operaciones Locales:</Text>
            <View style={styles.table}>
                <View style={styles.tableHead}>
                    <Text style={[styles.column, { width: '40%' }]}>Descripción</Text>
                    <Text style={[styles.column, { width: '30%' }]}>Base</Text>
                    <Text style={[styles.column, { width: '30%' }]}>Débitos</Text>
                </View>
                <View style={styles.tableBody}>
                    {debitos.map((row, key) => (
                        <View style={styles.rows} key={key}>
                            <Text style={[styles.column, { width: '40%' }]}>{row.key}</Text>
                            <Text style={[styles.column, { width: '30%' }]}>{parseMonto(row.base)}</Text>
                            <Text style={[styles.column, { width: '30%' }]}>{parseMonto(row.debitos)}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderPuntoCinco = (creditos: any[]) => (
        <View>
            <Text style={[styles.textlg, styles.blue]}>5. Crédito Fiscal por Operaciones Locales:</Text>
            <View style={styles.table}>
                <View style={styles.tableHead}>
                    <Text style={[styles.column, { width: '40%' }]}>Descripción</Text>
                    <Text style={[styles.column, { width: '30%' }]}>Base</Text>
                    <Text style={[styles.column, { width: '30%' }]}>Créditos</Text>
                </View>
                <View style={styles.tableBody}>
                    {creditos.map((row, key) => (
                        <View style={styles.rows} key={key}>
                            <Text style={[styles.column, { width: '40%' }]}>{row.key}</Text>
                            <Text style={[styles.column, { width: '30%' }]}>{parseMonto(row.base)}</Text>
                            <Text style={[styles.column, { width: '30%' }]}>{parseMonto(row.creditos)}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderPuntoSiete = (impuestos: any[]) => (
        <View>
            <Text style={[styles.textlg, styles.blue]}>7. Determinación del Crédito Fiscal:</Text>
            <View style={styles.table}>
                <View style={styles.tableHead}>
                    <Text style={[styles.column, { width: '60%' }]}>Descripción</Text>
                    <Text style={[styles.column, { width: '40%' }]}>Monto</Text>
                </View>
                <View style={styles.tableBody}>
                    {impuestos.map((row, key) => (
                        <View style={styles.rows} key={key}>
                            <Text style={[styles.column, { width: '60%' }]}>{row.key}</Text>
                            <Text style={[styles.column, { width: '40%' }]}>{parseMonto(row.monto)}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderPuntoNueveUno = (operacionesCantidad: any[]) => (
        <View>
            <Text style={[styles.textlg, styles.blue]}>9.1 Cantidad de Operaciones Realizadas:</Text>
            <View style={styles.table}>
                <View style={styles.tableHead}>
                    <Text style={[styles.column, { width: '50%' }]}>Descripción</Text>
                    <Text style={[styles.column, { width: '25%' }]}>Emitidas</Text>
                    <Text style={[styles.column, { width: '25%' }]}>Recibidas</Text>
                </View>
                <View style={styles.tableBody}>
                    {operacionesCantidad.map((row, key) => (
                        <View style={styles.rows} key={key}>
                            <Text style={[styles.column, { width: '50%' }]}>{row.key}</Text>
                            <Text style={[styles.column, { width: '25%' }]}>{row.emitidas}</Text>
                            <Text style={[styles.column, { width: '25%' }]}>{row.recibidas}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderMontoOperacionesRealizadas = (operacionesMonto: any[]) => (
        <View>
            <Text style={[styles.textlg, styles.blue]}>Monto de Operaciones Realizadas:</Text>
            <View style={styles.table}>
                <View style={styles.tableHead}>
                    <Text style={[styles.column, { width: '50%' }]}>Descripción</Text>
                    <Text style={[styles.column, { width: '25%' }]}>Emitidas</Text>
                    <Text style={[styles.column, { width: '25%' }]}>Recibidas</Text>
                </View>
                <View style={styles.tableBody}>
                    {operacionesMonto.map((row, key) => (
                        <View style={styles.rows} key={key}>
                            <Text style={[styles.column, { width: '50%' }]}>{row.key}</Text>
                            <Text style={[styles.column, { width: '25%' }]}>{row.emitidas}</Text>
                            <Text style={[styles.column, { width: '25%' }]}>{row.recibidas}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderPages = () => {
        const storedData = localStorage.getItem("formulario_iva_mensual_data");

        if (!storedData) {
            return [
                <EmptyPage
                    key={1}
                    message={
                        "No se pudo construir el reporte de IVA Mensual, contactese con soporte"
                    }
                />
            ];
        }

        const { debitos, creditos, impuestos, operacionesCantidad, operacionesMonto } = JSON.parse(storedData);

        return [
            <Page size="LEGAL" style={[styles.page]} orientation="portrait" key={2}>
                {renderEncabezado(0)}
                {renderPuntoTres(debitos)}
                {renderPuntoCinco(creditos)}
                {renderPuntoSiete(impuestos)}
                {renderPuntoNueveUno(operacionesCantidad)}
                {renderMontoOperacionesRealizadas(operacionesMonto)}
            </Page>
        ];
    };

    return (
        <PDFViewer className="h-screen w-screen">
            <Document
                title={`Formulario IVA Mensual (PDF) - ${empresaInfo.nombre} (${empresaInfo.nit}) - ${formatedDate}`}
            >
                {loading ? <LoadingDocumentPDF /> : renderPages()}
            </Document>
        </PDFViewer>
    );
};
