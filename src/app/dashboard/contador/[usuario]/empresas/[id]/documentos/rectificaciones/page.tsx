//src/app/dashboard/contador/[usuario]/empresas/[id]/documentos/rectificaciones/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { Path } from "@/components/molecules/Path";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";

// ✅ IMPORTACIÓN CORRECTA — EL COMPONENTE ES DEFAULT EXPORT
import Rectificacion from "@/components/organisms/especials/Rectificacion";

import { fetchService } from "@/utils/functions/fetchService";

interface EmpresaData {
  id: number;
  nit: string;
  nombre: string;
}

export default function EmpresaDocumentosRectificacionesPage() {
  const params = useParams();
  const search = useSearchParams();
  const usuario = params?.usuario as string;
  const empresaId = Number(params?.id);
  const tenantSlug = search.get("tenant") || String(usuario);

  const invalidEmpresaId = !empresaId || Number.isNaN(empresaId);

  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invalidEmpresaId) {
      setError("No se encontró la empresa. Verifica la URL.");
      setLoading(false);
      return;
    }

    const loadEmpresa = async () => {
      try {
        setLoading(true);

        const resp: any = await fetchService({
          url: `/api/empresas/${empresaId}?tenant=${encodeURIComponent(
            tenantSlug
          )}`,
          method: "GET",
        });

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

        const e = resp.data as EmpresaData;

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
  }, [empresaId, invalidEmpresaId, tenantSlug]);

  // ======================
  // Returns condicionales
  // ======================

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

  // ======================
  // Render principal
  // ======================

  return (
    <div className="flex min-h-screen bg-slate-50">
      <EmpresaSidebar empresaId={empresa.id} forceUsuario={String(usuario)} />

      <main className="flex-1 p-6">
        <div className="containerPage max-w-6xl mx-auto space-y-6">
          <Path
            parent={{
              text: "Documentos",
              href: `/dashboard/contador/${usuario}/empresas/${empresa.id}/documentos?tenant=${encodeURIComponent(
                tenantSlug
              )}`,
            }}
            hijos={[
              {
                text: "Rectificaciones de documentos",
                href: `/dashboard/contador/${usuario}/empresas/${empresa.id}/documentos/rectificaciones?tenant=${encodeURIComponent(
                  tenantSlug
                )}`,
              },
            ]}
          />

          {/* ======================= */}
          {/* 🔥 RECTIFICACIÓN ONLINE */}
          {/* ======================= */}

          <Rectificacion
            empresaId={empresa.id}
            empresaNombre={empresa.nombre}
            tenantSlug={tenantSlug}
          />
        </div>
      </main>
    </div>
  );
}
