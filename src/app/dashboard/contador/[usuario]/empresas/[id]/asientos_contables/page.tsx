// src/app/dashboard/contador/[usuario]/empresas/[id]/asientos_contables/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { Text } from "@/components/atoms";
import { AsientosContables } from "@/components/templates/AsientosContables";

type PageProps = {
  // Next 15: params/searchParams pueden venir como Promise (evita el error de “should be awaited”)
  params: Promise<{
    usuario: string; // en tu app esto funciona como tenant slug en la ruta
    id: string;      // empresaId en la ruta
  }>;
  searchParams?: Promise<{
    tenant?: string;
    [key: string]: string | string[] | undefined;
  }>;
};

export const metadata: Metadata = {
  title: "GNIO | Asientos Contables",
  description: "Buscador de asientos contables",
};

export default async function AsientosContablesPage({ params, searchParams }: PageProps) {
  const { usuario, id } = await params;

  const sp = (await searchParams) ?? {};
  const tenantFromQuery = typeof sp.tenant === "string" ? sp.tenant : "";
  const tenant = tenantFromQuery || usuario;

  const empresaId = Number(id);
  if (!empresaId || Number.isNaN(empresaId)) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Text variant="title">Asientos contables</Text>
        <Text variant="subtitle">Buscador de asientos</Text>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-64 lg:w-72 flex-shrink-0">
          <EmpresaSidebar empresaId={empresaId} forceUsuario={String(usuario)} />
        </div>

        <div className="flex-1">
          <AsientosContables empresaId={empresaId} tenant={tenant} />
        </div>
      </div>
    </div>
  );
}
