// src/app/pdf/libros/diario/page.tsx

import { LibroDiarioPDF } from "@/components/templates/pdf/LibroDiarioPDF";

type PageProps = {
  searchParams: Promise<{
    empresa?: string;
    date?: string;
    detalle?: string;
    orden?: string;
    folio?: string;
    criterio?: string;
  }>;
};

export default async function LibroDiarioPdfPage({ searchParams }: PageProps) {
  // Resolvemos los searchParams como pide Next 15
  const sp = await searchParams;

  // Log de control en el servidor
  console.log("[/pdf/libros/diario] searchParams desde Next:", sp);

  // Pasamos el objeto plano al componente cliente
  return <LibroDiarioPDF searchParams={sp} />;
}
