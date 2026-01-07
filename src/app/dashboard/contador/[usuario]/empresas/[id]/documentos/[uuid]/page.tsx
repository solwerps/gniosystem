//src/app/dashboard/contador/[usuario]/empresas/[id]/documentos/[uuid]/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Path } from "@/components/molecules/path";
import { UploadDocumentos } from "@/components/organisms/cargas/UploadDocumentos";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";

export default function EmpresaDocumentoUUIDPage() {
  const params = useParams();
  const usuario = params?.usuario as string;
  const empresa_id = Number(params?.id);
  const uuid = String(params?.uuid);

  return (
    <div className="flex">
      {/* ✅ Sidebar dinámico de la empresa */}
      <EmpresaSidebar empresaId={empresa_id} forceUsuario={String(usuario)} />

      {/* ✅ Contenido principal */}
      <div className="flex flex-col flex-1 gap-4 p-4">
        <Path
          items={[
            {
              label: "Documentos",
              href: `/dashboard/contador/${usuario}/empresas/${empresa_id}/documentos`,
            },
            {
              label: "Detalle del Documento",
              href: `/dashboard/contador/${usuario}/empresas/${empresa_id}/documentos/${uuid}`,
            },
          ]}
        />
        <UploadDocumentos empresa_id={empresa_id} uuid={uuid} />
      </div>
    </div>
  );
}
