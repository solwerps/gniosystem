// src/app/dashboard/contador/[usuario]/empresas/cargar/page.tsx
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { UploadEmpresas } from "@/components/organisms/cargas/UploadEmpresas";

export default function CargarEmpresasPage() {
  const params = useParams<{ usuario: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const tenantSlug = search.get("tenant") || params.usuario;

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar role="CONTADOR" usuario={String(params.usuario)} active="Empresas" />
      <main className="flex-1 p-6 lg:p-10 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Cargar Empresas</h1>
              <p className="text-slate-600">
                Sube un Excel con: Nombre de empresa, NIT, Sector Economico y Razon Social.
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Volver
            </button>
          </div>

          <div className="mt-8">
            <UploadEmpresas tenantSlug={String(tenantSlug)} />
          </div>
        </div>
      </main>
    </div>
  );
}
