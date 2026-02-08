// src/app/pdf/libros/diario-detalle/page.tsx

import { LibroDiarioDetallePDF } from "@/components/templates/pdf/LibroDiarioDetallePDF";

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

export default async function LibroDiarioDetallePdfPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;

  console.log("[/pdf/libros/diario-detalle] searchParams desde Next:", sp);

  return <LibroDiarioDetallePDF searchParams={sp} />;
}
