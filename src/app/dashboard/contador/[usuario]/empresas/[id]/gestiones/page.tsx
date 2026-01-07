// src/app/dashboard/contador/[usuario]/empresas/[id]/gestiones/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import TabLoading from "@/components/empresas/TabLoading";
import { LIBROS } from "@/components/empresas/constants";

import type { FolioLibro } from "@/types/empresas";

// Tab de gestiones (folios)
const GestionesTab = dynamic(
  () => import("@/components/empresas/GestionesTab"),
  { loading: () => <TabLoading /> }
);

// Tipo mínimo para lo que necesitamos del GET /api/empresas/:id
type EmpresaApi = {
  id: number;
  tenant: string;
  nombre: string;
  nit: string;
  sectorEconomico: string;
  razonSocial: string;
  avatarUrl?: string | null;
  infoIndividual?: any;
  infoJuridico?: any;
  afiliaciones?: any;
  gestiones?: {
    folios: {
      libro: string;
      disponibles: number;
      usados: number;
      ultimaFecha: string | null;
    }[];
    correlativos: any;
  };
  cuentasBancarias?: any[];
};

export default function GestionesPage() {
  const params = useParams<{ usuario: string; id: string }>();
  const search = useSearchParams();

  const tenant = search.get("tenant") || params.usuario;
  const empresaId = Number(params.id);

  // Datos completos de la empresa (para el PUT)
  const [empresa, setEmpresa] = useState<EmpresaApi | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado local de gestiones (folios)
  const [folios, setFolios] = useState<FolioLibro[]>(
    LIBROS.map((libro) => ({
      libro,
      disponibles: 0,
      usados: 0,
      ultimaFecha: null,
    }))
  );

  const [folioModal, setFolioModal] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });

  const [folioAdd, setFolioAdd] = useState<number>(10);

  // ============================================
  // Cargar empresa + folios actuales
  // ============================================
  useEffect(() => {
    if (!empresaId || Number.isNaN(empresaId)) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/empresas/${empresaId}?tenant=${tenant}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          console.error("Error cargando empresa:", await res.text());
          setEmpresa(null);
          return;
        }

        const json = await res.json();
        const data: EmpresaApi | undefined = json?.data;
        if (!data) {
          setEmpresa(null);
          return;
        }

        setEmpresa(data);

        // Si ya tiene gestiones/folios guardados, los usamos
        if (data.gestiones && Array.isArray(data.gestiones.folios) && data.gestiones.folios.length > 0) {
          setFolios(
            data.gestiones.folios.map((f) => ({
              libro: f.libro,
              disponibles: Number(f.disponibles ?? 0),
              usados: Number(f.usados ?? 0),
              ultimaFecha: f.ultimaFecha ?? null,
            }))
          );
        }
      } catch (e) {
        console.error("Error GET /api/empresas/:id", e);
        setEmpresa(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [empresaId, tenant]);

  // ============================================
  // Guardar gestiones usando PUT /api/empresas/:id
  // ============================================
  const onGuardar = async () => {
    if (!empresa) {
      alert("La empresa aún no está cargada. Intenta nuevamente.");
      return;
    }

    // Reconstruimos el campo info como lo espera el backend
    let info: any = null;
    if (empresa.infoIndividual) {
      info = { tipo: "Individual", ...empresa.infoIndividual };
    } else if (empresa.infoJuridico) {
      info = { tipo: "Juridico", ...empresa.infoJuridico };
    }

    const payload = {
      tenant, // lo toma del body o del query, lo dejamos igual
      nombre: empresa.nombre,
      nit: empresa.nit,
      sectorEconomico: empresa.sectorEconomico,
      razonSocial: empresa.razonSocial,
      avatarUrl: empresa.avatarUrl,
      info,
      afiliaciones: empresa.afiliaciones,
      gestiones: {
        folios,
        correlativos: empresa.gestiones?.correlativos ?? [],
      },
      cuentasBancarias: empresa.cuentasBancarias ?? [],
    };

    const res = await fetch(`/api/empresas/${empresaId}?tenant=${tenant}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Error guardando empresa:", await res.text());
      alert("No se pudieron guardar las gestiones (folios).");
      return;
    }

    alert("Gestiones (folios) guardadas correctamente.");
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Sidebar de la empresa (Regresar, Dashboard, Configuraciones, etc.) */}
      <EmpresaSidebar
        empresaId={empresaId}
        forceUsuario={String(params.usuario)}
      />

      <main className="flex-1 p-6 lg:p-10 bg-white">
        <div className="max-w-[1100px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h1 className="text-3xl font-bold">
              Partida inicial / Gestiones de Folios
            </h1>
            <button
              onClick={onGuardar}
              disabled={loading || !empresa}
              className={`rounded-xl px-5 py-2 text-white shadow ${
                loading || !empresa
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading || !empresa ? "Cargando..." : "Guardar cambios"}
            </button>
          </div>

          <div className="mt-8 border-t pt-6">
            <GestionesTab
              folios={folios}
              setFolios={setFolios}
              folioModal={folioModal}
              setFolioModal={setFolioModal}
              folioAdd={folioAdd}
              setFolioAdd={setFolioAdd}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
