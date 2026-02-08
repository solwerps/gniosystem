import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { Path } from "@/components/molecules/Path";
import { Conciliacion } from "@/components/templates/Conciliacion";

type PageProps = {
  params: Promise<{
    usuario: string;
    id: string;
  }>;
};

export default async function ConciliacionPage({ params }: PageProps) {
  const { usuario, id } = await params;
  const empresaId = Number(id);

  if (!empresaId || Number.isNaN(empresaId)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-600">
          Empresa inválida. Verifica el identificador en la URL.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <EmpresaSidebar empresaId={empresaId} forceUsuario={usuario} />

      <main className="flex-1 p-6">
        <div className="containerPage mx-auto max-w-7xl space-y-6">
          <Path
            parent={{
              text: "Conciliación Bancaria",
              href: `/dashboard/contador/${usuario}/empresas/${empresaId}/libros/conciliacion`,
            }}
          />

          <Conciliacion empresaId={empresaId} usuario={usuario} />
        </div>
      </main>
    </div>
  );
}
