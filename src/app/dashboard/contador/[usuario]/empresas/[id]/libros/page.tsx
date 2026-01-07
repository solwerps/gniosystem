// src/app/dashboard/contador/[usuario]/empresas/[id]/libros/page.tsx

import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { Libros } from "@/components/templates/Libros";

type PageProps = {
  params: Promise<{
    usuario: string;
    id: string; // viene como string desde la URL
  }>;
};

export default async function LibrosPage({ params }: PageProps) {
  // 👇 AQUÍ se "espera" params, como pide Next
  const { usuario, id } = await params;

  const empresa_id = Number(id);

  if (Number.isNaN(empresa_id) || !empresa_id) {
    return (
      <div className="p-4">
        <p className="text-red-600">
          Empresa inválida. No se pudo interpretar el identificador de empresa.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-4">
      {/* Sidebar de la empresa */}
      <EmpresaSidebar empresaId={empresa_id} forceUsuario={usuario} />

      {/* Contenido principal: Libros (template) */}
      <div className="flex-1 flex flex-col gap-4">
        <Libros empresa_id={empresa_id} usuario={usuario} />
      </div>
    </div>
  );
}
