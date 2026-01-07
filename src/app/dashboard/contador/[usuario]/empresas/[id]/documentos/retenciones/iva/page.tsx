//src/app/dashboard/contador/[usuario]/empresas/[id]/documentos/retenciones/iva/page.tsx

"use client";

import React from "react";
import { useParams } from "next/navigation";

import { Path } from "@/components/molecules/Path";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { RetencionesIVA } from "@/components/templates/Retenciones";

export default function EmpresaRetencionesIVAPage() {
  const params = useParams();
  const usuario = params?.usuario as string;
  const empresaId = Number(params?.id);

  const invalidEmpresaId = !empresaId || Number.isNaN(empresaId);

  if (invalidEmpresaId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-600">
          No se encontró la empresa. Verifica la URL.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar de la empresa */}
      <EmpresaSidebar empresaId={empresaId} forceUsuario={String(usuario)} />

      {/* Contenido principal */}
      <main className="flex-1 p-6">
        <div className="containerPage max-w-6xl mx-auto space-y-6">
          <Path
            parent={{
              text: "Retenciones IVA",
              href: `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos/retenciones/iva`,
            }}
          />

          <RetencionesIVA
            empresaId={empresaId}
            empresaNombre="Empresa"
            cargarHref={`/dashboard/contador/${usuario}/empresas/${empresaId}/documentos/retenciones/iva/cargar`}
          />
        </div>
      </main>
    </div>
  );
}
