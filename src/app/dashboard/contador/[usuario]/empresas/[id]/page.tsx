// src/app/dashboard/contador/[usuario]/empresas/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { fetchService } from "@/utils/functions/fetchService";
import EmpresaDashboardTasks from "@/components/organisms/tareas/EmpresaDashboardTasks";

interface EmpresaData {
  id: number;
  nit: string;
  nombre: string;
}

export default function EmpresaDashboardPage() {
  const params = useParams<{ usuario: string; id: string }>();

  const empresaId = Number(params.id);
  const usuario = params.usuario;

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
          url: `/api/empresas/${empresaId}?compact=1`,
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

        const e = resp.data;

        setEmpresa({
          id: e.id,
          nit: e.nit,
          nombre: e.nombre,
        });
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Error al cargar la información de la empresa.");
      } finally {
        setLoading(false);
      }
    };

    loadEmpresa();
  }, [empresaId, invalidEmpresaId]);

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
    <div className="min-h-screen w-full flex bg-slate-50">
      <EmpresaSidebar empresaId={empresaId} forceUsuario={String(usuario)} />

      <main className="flex-1 p-6">
        <div className="containerPage max-w-6xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow p-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-slate-600">
              Bienvenido a la empresa <span className="font-semibold">{empresa.nombre}</span>
            </p>
          </div>

          <EmpresaDashboardTasks
            tenantSlug={String(usuario)}
            empresaNombre={empresa.nombre}
          />
        </div>
      </main>
    </div>
  );
}
