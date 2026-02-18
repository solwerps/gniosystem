// src/app/dashboard/contador/[usuario]/empresas/[id]/asientos_contables/crear/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { Text } from "@/components/atoms";
import { AsientoContableForm } from "@/components/organisms/forms/AsientoContableForm";

type PageProps = {
  params: Promise<{
    usuario: string;
    id: string;
  }>;
  searchParams?: Promise<{
    tenant?: string;
  }>;
};

export const metadata: Metadata = {
  title: "GNIO | Agregar Asiento Contable",
  description: "Agregar Asiento Contable",
};

export default async function AsientosContablesCrearPage({ params, searchParams }: PageProps) {
  const { usuario, id } = await params;
  const sp = (await searchParams) ?? {};
  const tenant = (sp.tenant && String(sp.tenant)) || usuario; // fallback seguro

  const empresaId = Number(id);
  if (!empresaId || Number.isNaN(empresaId)) notFound();

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="md:w-64 lg:w-72 flex-shrink-0">
        <EmpresaSidebar empresaId={empresaId} forceUsuario={String(usuario)} />
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Text variant="title">Asientos contables</Text>
          <Text variant="subtitle">Agregar asiento contable</Text>
        </div>

        <AsientoContableForm empresaId={empresaId} tenant={tenant} />
      </div>
    </div>
  );
}
