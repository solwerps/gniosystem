import { IVAMensualPDF } from "@/components/templates/pdf/IVAMensualPDF";

type PageProps = {
  searchParams: Promise<{
    empresa?: string;
    date?: string;
  }>;
};

export default async function ReporteIvaMensualPdfPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  return <IVAMensualPDF searchParams={sp} />;
}
