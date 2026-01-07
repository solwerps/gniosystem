// src/app/dashboard/contador/[usuario]/empresas/[id]/bancos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import TabLoading from "@/components/empresas/TabLoading";
import { Field, Input, Select } from "@/components/empresas/ui";
import { BANCOS_SUGERIDOS } from "@/components/empresas/constants";

import type { CuentaBancariaForm, CuentaOpt } from "@/types/empresas";

const BancosTab = dynamic(
  () => import("@/components/empresas/BancosTab"),
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
  afiliaciones?: {
    regimenIvaId?: number;
    regimenIsrId?: number;
    nomenclaturaId?: number;
    obligaciones?: any[];
  };
  gestiones?: {
    folios: {
      libro: string;
      disponibles: number;
      usados: number;
      ultimaFecha: string | null;
    }[];
    correlativos: any;
  };
  cuentasBancarias?: {
    id: number;
    numero: string;
    banco: string;
    descripcion: string;
    // 👇 mismísimo tipo que en CuentaBancariaForm
    moneda: CuentaBancariaForm["moneda"];
    saldoInicial: number;
    cuentaContableId?: number;
  }[];
};

export default function BancosPage() {
  const params = useParams<{ usuario: string; id: string }>();
  const search = useSearchParams();
  const tenant = search.get("tenant") || params.usuario;
  const empresaId = Number(params.id);

  // Empresa completa (para PUT)
  const [empresa, setEmpresa] = useState<EmpresaApi | null>(null);
  const [loading, setLoading] = useState(true);

  // Cuentas bancarias
  const [cuentaTmp, setCuentaTmp] = useState<CuentaBancariaForm>({
    numero: "",
    banco: "",
    descripcion: "",
    moneda: "GTQ",
    saldoInicial: 0,
    cuentaContableId: undefined,
  });
  const [cuentas, setCuentas] = useState<CuentaBancariaForm[]>([]);

  // Cuentas contables (para linkear cuenta bancaria ↔ cuenta contable)
  const [cuentasNomen, setCuentasNomen] = useState<CuentaOpt[]>([]);

  // ============================
  // Cargar empresa (GET /api/empresas/:id)
  // ============================
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

        // Inicializar cuentas bancarias desde lo que ya tenga la empresa
        if (
          Array.isArray(data.cuentasBancarias) &&
          data.cuentasBancarias.length > 0
        ) {
          setCuentas(
            data.cuentasBancarias.map((c) => ({
              numero: c.numero,
              banco: c.banco,
              descripcion: c.descripcion ?? "",
              // 👇 ya es CuentaBancariaForm["moneda"], solo le damos default
              moneda: c.moneda ?? "GTQ",
              saldoInicial: Number(c.saldoInicial ?? 0),
              cuentaContableId: c.cuentaContableId ?? undefined,
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

  // ============================
  // Cargar cuentas contables de la nomenclatura afiliada
  // ============================
  const nomenclaturaId = empresa?.afiliaciones?.nomenclaturaId;

  useEffect(() => {
    (async () => {
      if (!nomenclaturaId) {
        setCuentasNomen([]);
        return;
      }

      try {
        const res = await fetch(
          `/api/nomenclaturas/${nomenclaturaId}/cuentas?tenant=${tenant}`,
          { cache: "no-store", credentials: "include" }
        );
        const data = await res.json();

        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        setCuentasNomen(
          items.map((c: any) => ({
            id: c.id,
            codigo: c.cuenta || c.codigo || "",
            descripcion: c.descripcion || c.nombre || "",
          }))
        );
      } catch (e) {
        console.error("Error cargando cuentas de nomenclatura:", e);
        setCuentasNomen([]);
      }
    })();
  }, [nomenclaturaId, tenant]);

  // ============================
  // Guardar usando PUT /api/empresas/:id
  // ============================
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
      tenant,
      nombre: empresa.nombre,
      nit: empresa.nit,
      sectorEconomico: empresa.sectorEconomico,
      razonSocial: empresa.razonSocial,
      avatarUrl: empresa.avatarUrl,
      info,
      afiliaciones: empresa.afiliaciones,
      // Importantísimo: mandar las gestiones existentes para no borrarlas
      gestiones: empresa.gestiones ?? { folios: [], correlativos: [] },
      // Aquí van las cuentas bancarias editadas en esta vista
      cuentasBancarias: cuentas,
    };

    const res = await fetch(`/api/empresas/${empresaId}?tenant=${tenant}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Error guardando empresa:", await res.text());
      alert("No se pudieron guardar las cuentas bancarias.");
      return;
    }

    alert("Cuentas bancarias guardadas correctamente.");
  };

  return (
    <div className="min-h-screen w-full flex">
      <EmpresaSidebar
        empresaId={empresaId}
        forceUsuario={String(params.usuario)}
      />

      <main className="flex-1 p-6 lg:p-10 bg-white">
        <div className="max-w-[1100px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h1 className="text-4xl font-bold">
              Partida inicial / Cuentas bancarias
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
            <BancosTab
              Field={Field}
              Input={Input}
              Select={Select}
              cuentaTmp={cuentaTmp}
              setCuentaTmp={setCuentaTmp}
              cuentas={cuentas}
              setCuentas={setCuentas}
              bancosSugeridos={BANCOS_SUGERIDOS}
              cuentasNomen={cuentasNomen}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
