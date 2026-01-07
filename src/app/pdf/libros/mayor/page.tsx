// src/app/pdf/libros/mayor/page.tsx

import { LibroMayorPDF } from "@/components/templates/pdf/LibroMayorPDF";

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

export default async function LibroMayorPdfPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  console.log("[/pdf/libros/mayor] searchParams desde Next:", sp);

  return <LibroMayorPDF searchParams={sp} />;
}
