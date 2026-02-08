// src/app/pdf/libros/balance/page.tsx

import { BalanceGeneralPDF } from "@/components/templates/pdf/BalanceGeneralPDF";

type PageProps = {
  searchParams: Promise<{
    empresa?: string;
    date1?: string;
    date2?: string;
    folio?: string;
  }>;
};

export default async function BalanceGeneralPdfPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;

  console.log("[/pdf/libros/balance] searchParams desde Next:", sp);

  return <BalanceGeneralPDF searchParams={sp} />;
}
