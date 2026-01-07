// src/app/pdf/libros/ventas/page.tsx

import { LibroVentasPDF } from "@/components/templates/pdf/LibroVentasPDF";

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

export default async function LibroVentasPdfPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  console.log("[/pdf/libros/ventas] searchParams desde Next:", sp);

  return <LibroVentasPDF searchParams={sp} />;
}
