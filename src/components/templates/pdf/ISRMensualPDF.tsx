//src/components/templates/pdf/ISRMensualPDF.tsx
"use client";
import { PDFLoader } from "@/components/atoms";
import { EmptyPage } from "@/components/templates/pdf/EmptyPage";
import { LoadingDocumentPDF } from "@/components/templates/pdf/LoadingDocumentPDF";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import dynamic from "next/dynamic";
import { styles } from "./style";
import { IDocumento, obtenerDocumentosReportes, obtenerEmpresa } from "@/utils";
import { useEffect, useState } from "react";

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <PDFLoader />
    }
);

export const ISRMensualPDF = ({
    searchParams
}: {
    searchParams: any;
}) => {
    let date = searchParams.date ?? "";
    let empresa = searchParams.empresa ?? "0";
    const empresaId = Number(empresa) || 0;
    const [documentos, setDocumentos] = useState<IDocumento[]>([]);
    const [empresaInfo, setEmpresaInfo] = useState({
        nombre: "",
        nit: "",
    });
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const getData = async () => {
            try {
                if (date && empresaId) {
                    const [docsResp, empresaResp] = await Promise.all([
                        obtenerDocumentosReportes(empresaId, date, true),
                        obtenerEmpresa(empresaId),
                    ]);

                    const docsAny: any = docsResp ?? {};
                    const docsStatus =
                        docsAny.status ?? (docsAny.ok ? 200 : 500);
                    const docsData: IDocumento[] = docsAny.data ?? [];

                    if (docsStatus === 200) {
                        setDocumentos(docsData);
                    } else {
                        setDocumentos([]);
                    }

                    const empresaAny: any = empresaResp ?? {};
                    const empresaStatus =
                        empresaAny.status ?? (empresaAny.ok ? 200 : 500);
                    const dataEmpresa = empresaAny.data;

                    if (empresaStatus === 200 && dataEmpresa) {
                        setEmpresaInfo({
                            nombre: dataEmpresa.nombre ?? "",
                            nit: dataEmpresa.nit ?? "",
                        });
                    }
                }
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };
        getData();
    }, [date, empresaId]);

    const renderPages = () => {
        if (documentos.length === 0) {
            return [
                <EmptyPage
                    key={1}
                    message="No se encontraron documentos para este periodo."
                />
            ];
        }

        return [
            <Page
                size="A4"
                style={[styles.page]}
                orientation="landscape"
                key={1}
            >
                <View style={[styles.header]}>
                    <Text style={[styles.title, styles.blue]}>
                        Reporte ISR Mensual
                    </Text>
                    <View
                        style={[
                            styles.flexColumn,
                            styles.itemsEnd,
                            { marginTop: 10 }
                        ]}
                    >
                        <Text style={[{ fontSize: 10 }]}>
                            {empresaInfo.nombre} ({empresaInfo.nit})
                        </Text>
                        <Text style={[{ fontSize: 10 }]}>
                            Fecha: {date}
                        </Text>
                    </View>
                </View>
                <View style={styles.table}>
                    <View style={styles.tableHead}>
                        <Text style={[styles.column, {width: '10%'}]}>Documento</Text>
                        <Text style={[styles.column, {width: '10%'}]}>Fecha</Text>
                        <Text style={[styles.column, {width: '30%'}]}> Nombre del Comprador </Text>
                        <Text style={[styles.column, {width: '10%'}]}>Excentos</Text>
                        <Text style={[styles.column, {width: '10%'}]}>Servicio Monto</Text>
                        <Text style={[styles.column, {width: '10%'}]}>Bien Monto</Text>
                        <Text style={[styles.column, {width: '10%'}]}>IVA</Text>
                        <Text style={[styles.column, {width: '10%'}]}>Total</Text>
                    </View>
                    <View style={[styles.tableBody]}>
                        {
                            documentos.map((factura: IDocumento, key) => (
                                <View key={key} style={styles.rows}>
                                    <Text style={[styles.row, {width: '10%'}]}>{factura.numero_dte}</Text>
                                    <Text style={[styles.row, {width: '10%'}]}>{factura.fecha_emision.slice(0,7)}</Text>
                                    <Text style={[styles.row, {width: '30%'}]}>{factura.nombre_receptor}</Text>
                                    <Text style={[styles.row, {width: '10%'}]}>0</Text>
                                    <Text style={[styles.row, {width: '10%'}]}>{factura.tipo == "servicio" ? Number(factura.monto_total).toFixed(2) : 0}</Text>
                                    <Text style={[styles.row, {width: '10%'}]}>{factura.tipo == "bien" ? Number(factura.monto_total).toFixed(2) : 0}</Text>
                                    <Text style={[styles.row, {width: '10%'}]}>{Number(factura.iva).toFixed(2)}</Text>
                                    <Text style={[styles.row, {width: '10%'}]}>{(Number(factura.monto_total) + Number(factura.iva)).toFixed(2)}</Text>
                                </View>
                            ))
                        }
                    </View>
                </View>
            </Page>
        ];
    };

    return (
        <PDFViewer className="h-screen w-screen">
            <Document>
                {loading ? <LoadingDocumentPDF /> : renderPages()}
            </Document>
        </PDFViewer>
    );
};
