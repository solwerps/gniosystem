import Sidebar from '@/components/Sidebar';

type PageProps = {
  params: Promise<{ usuario: string }>;
};

export default async function ContadorDashboard({ params }: PageProps) {
  const { usuario } = await params;
  return (
    <div className="flex">
      <Sidebar role="CONTADOR" usuario={usuario} />
      <main className="flex-1 p-10 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Sistema Contable GNIO 1.1 (Contador)</h1>
        <p>Bienvenido contador. Aquí puedes manejar balances y reportes.</p>
      </main>
    </div>
  );
}
