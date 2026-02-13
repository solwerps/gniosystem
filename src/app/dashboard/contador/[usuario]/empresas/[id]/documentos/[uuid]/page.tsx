"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { Path } from "@/components/molecules/Path";
import { Button } from "@/components/atoms";

type DocumentoDetalle = {
  uuid: string;
  serie: string;
  numero_dte: string;
  tipo_dte: string;
  fecha_emision: string;
  fecha_trabajo: string;
  tipo_operacion: string;
  condicion_pago?: string | null;
  monto_total: string | number;
  iva: string | number;
  nombre_emisor: string;
  nombre_receptor: string;
  asiento_contable_id?: number | null;
};

export default function EmpresaDocumentoUUIDPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();

  const usuario = String(params?.usuario ?? "");
  const empresaId = Number(params?.id);
  const uuid = String(params?.uuid ?? "");
  const tenantSlug = search.get("tenant") || usuario;

  const tenantQs = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : "";

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [documento, setDocumento] = useState<DocumentoDetalle | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!uuid || !empresaId) return;

      try {
        setLoading(true);
        const res = await fetch(
          `/api/documentos/uuid?uuid=${encodeURIComponent(
            uuid
          )}&empresa_id=${empresaId}&tenant=${encodeURIComponent(tenantSlug)}`,
          {
            cache: "no-store",
          }
        );
        const json = await res.json();
        if (!alive) return;

        if (!res.ok || !json?.data) {
          throw new Error(json?.message || "No se pudo cargar el documento.");
        }

        setDocumento(json.data);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.message || "Error al cargar el documento.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [uuid, empresaId, tenantSlug]);

  const canPost = useMemo(
    () => Boolean(documento?.uuid && !documento?.asiento_contable_id),
    [documento]
  );

  const postDocumento = async () => {
    if (!documento?.uuid) return;
    try {
      setPosting(true);
      const res = await fetch("/api/contabilidad/documentos/postear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant: tenantSlug,
          empresa_id: empresaId,
          documento_uuid: documento.uuid,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message || "No se pudo contabilizar el documento.");
        return;
      }

      toast.success("Documento contabilizado correctamente.");
      router.push(
        `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos${tenantQs}`
      );
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al contabilizar documento.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <EmpresaSidebar empresaId={empresaId} forceUsuario={usuario} />
      <main className="flex-1 p-6">
        <div className="containerPage max-w-5xl mx-auto space-y-6">
          <Path
            parent={{
              text: "Documentos",
              href: `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos${tenantQs}`,
            }}
            hijos={[
              {
                text: `Documento ${uuid}`,
                href: `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos/${uuid}${tenantQs}`,
              },
            ]}
          />

          {loading && (
            <div className="rounded-lg bg-white p-6 text-sm text-slate-500 shadow">
              Cargando documento...
            </div>
          )}

          {!loading && !documento && (
            <div className="rounded-lg bg-white p-6 text-sm text-red-600 shadow">
              No se encontró el documento solicitado.
            </div>
          )}

          {!loading && documento && (
            <div className="rounded-lg bg-white p-6 shadow space-y-4">
              <h2 className="text-xl font-semibold">Detalle de Documento</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p>
                  <span className="font-semibold">UUID:</span> {documento.uuid}
                </p>
                <p>
                  <span className="font-semibold">Serie / DTE:</span>{" "}
                  {documento.serie}-{documento.numero_dte}
                </p>
                <p>
                  <span className="font-semibold">Tipo DTE:</span>{" "}
                  {documento.tipo_dte}
                </p>
                <p>
                  <span className="font-semibold">Operación:</span>{" "}
                  {documento.tipo_operacion}
                </p>
                <p>
                  <span className="font-semibold">Condición:</span>{" "}
                  {documento.condicion_pago ?? "N/D"}
                </p>
                <p>
                  <span className="font-semibold">Asiento:</span>{" "}
                  {documento.asiento_contable_id
                    ? `#${documento.asiento_contable_id}`
                    : "Pendiente"}
                </p>
                <p>
                  <span className="font-semibold">Fecha emisión:</span>{" "}
                  {String(documento.fecha_emision).slice(0, 10)}
                </p>
                <p>
                  <span className="font-semibold">Fecha trabajo:</span>{" "}
                  {String(documento.fecha_trabajo).slice(0, 10)}
                </p>
                <p>
                  <span className="font-semibold">Total:</span> Q{" "}
                  {Number(documento.monto_total || 0).toFixed(2)}
                </p>
                <p>
                  <span className="font-semibold">IVA:</span> Q{" "}
                  {Number(documento.iva || 0).toFixed(2)}
                </p>
                <p>
                  <span className="font-semibold">Emisor:</span>{" "}
                  {documento.nombre_emisor}
                </p>
                <p>
                  <span className="font-semibold">Receptor:</span>{" "}
                  {documento.nombre_receptor}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() =>
                    router.push(
                      `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos${tenantQs}`
                    )
                  }
                  variant="error"
                >
                  Regresar
                </Button>
                <Button
                  onClick={postDocumento}
                  loading={posting}
                  disabled={!canPost}
                >
                  Contabilizar documento
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
