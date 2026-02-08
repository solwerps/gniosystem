import { ISRMensualPDF } from "@/components/templates/pdf/ISRMensualPDF";

type PageProps = {
  searchParams: Promise<{
    empresa?: string;
    date?: string;
  }>;
};

export default async function ReporteIsrMensualPdfPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  return <ISRMensualPDF searchParams={sp} />;
}
