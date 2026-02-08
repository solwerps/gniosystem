"use client";

import React from "react";
import { useParams } from "next/navigation";

import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { Path } from "@/components/molecules/Path";
import { Reportes } from "@/components/templates/Reportes";

export default function EmpresaReportesPage() {
  const params = useParams();
  const usuario = params?.usuario as string;
  const empresaId = Number(params?.id);

  const invalidEmpresaId = !empresaId || Number.isNaN(empresaId);

  if (invalidEmpresaId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-600">
          No se encontro la empresa. Verifica la URL.
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
              text: "Reportes",
              href: `/dashboard/contador/${usuario}/empresas/${empresaId}/reportes`,
            }}
          />
          <Reportes empresa_id={empresaId} usuario={String(usuario)} />
        </div>
      </main>
    </div>
  );
}
