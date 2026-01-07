// src/app/dashboard/contador/[usuario]/empresas/[id]/documentos/carga/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Path } from "@/components/molecules/Path";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { UploadDocumentos } from "@/components/organisms/cargas/UploadDocumentos";

import { fetchService } from "@/utils/functions/fetchService";

interface EmpresaData {
  id: number;
  nit: string;
  nombre: string;
}

export default function EmpresaDocumentosCargaPage() {
  const params = useParams();
  const usuario = params?.usuario as string;
  const empresaId = Number(params?.id);

  // 👇 calculamos la validez, pero sin hacer return todavía
  const invalidEmpresaId = !empresaId || Number.isNaN(empresaId);

  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 useEffect SIEMPRE se llama, pero se auto-sale si el id es inválido
  useEffect(() => {
    if (invalidEmpresaId) {
      setError("No se encontró la empresa. Verifica la URL.");
      setLoading(false);
      return;
    }

    const loadEmpresa = async () => {
      try {
        setLoading(true);

        // 🔴 AQUÍ CAMBIA: ya NO desestructuramos status/data/message directo
        const resp: any = await fetchService({
          url: `/api/empresas/${empresaId}`,
          method: "GET",
        });

        /**
         * Formatos posibles:
         *  A) GNIO empresas: { ok: true, data: {...}, error?: string }
         *  B) Estilo viejo:  { status: 200, data: {...}, message?: string }
         */

        const status =
          typeof resp.status === "number"
            ? resp.status
            : resp.ok
            ? 200
            : 400;

        if (status !== 200 || !resp.data) {
          const msg =
            resp.message ||
            resp.error ||
            "No se pudo obtener la información de la empresa.";
          throw new Error(msg);
        }

        const e = resp.data;

        // Solo lo que necesita esta pantalla
        setEmpresa({
          id: e.id,
          nit: e.nit,
          nombre: e.nombre,
        });
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message || "Error al cargar la información de la empresa."
        );
      } finally {
        setLoading(false);
      }
    };

    loadEmpresa();
  }, [empresaId, invalidEmpresaId]);

  // 🔹 ahora sí, returns condicionales

  if (invalidEmpresaId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-600">
          No se encontró la empresa. Verifica la URL.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <EmpresaSidebar empresaId={empresaId} forceUsuario={String(usuario)} />
        <main className="flex-1 p-6">
          <div className="containerPage max-w-6xl mx-auto space-y-6">
            <p className="text-sm text-slate-500">
              Cargando información de la empresa...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !empresa) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-600">
          {error || "No se pudo cargar la información de la empresa."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <EmpresaSidebar empresaId={empresaId} forceUsuario={String(usuario)} />

      <main className="flex-1 p-6">
        <div className="containerPage max-w-6xl mx-auto space-y-6">
          <Path
            parent={{
              text: "Documentos",
              href: `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos`,
            }}
            hijos={[
              {
                text: "Carga masiva de documentos",
                href: `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos/carga`,
              },
            ]}
          />

          <UploadDocumentos
            empresaId={empresa.id}
            empresaNit={empresa.nit}
            empresaNombre={empresa.nombre}
            usuario={usuario}
          />
        </div>
      </main>
    </div>
  );
}
