// src/app/pdf/libros/compras/page.tsx

import { LibroComprasPDF } from "@/components/templates/pdf/LibroComprasPDF";

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

export default async function LibroComprasPdfPage({ searchParams }: PageProps) {
  // 👇 AQUÍ se espera searchParams, como pide Next
  const sp = await searchParams;

  // Solo para verificar en consola del servidor:
  console.log("[/pdf/libros/compras] searchParams desde Next:", sp);

  // Pasamos el objeto PLANO al componente cliente
  return <LibroComprasPDF searchParams={sp} />;
}
