//src/app/dashboard/contador/[usuario]/empresas/[id]/configurar/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

// Sidebar de empresa
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";

// UI reutilizable
import { Field, Input, Select, Option } from "@/components/empresas/ui";
import TabLoading from "@/components/empresas/TabLoading";

// Tipos
import type {
  NomenclaturaOption,
  ObligacionRow,
  RazonSocial,
  RegimenOption,
} from "@/types/empresas";

// ==== Secciones (code-splitting) ====
const InfoTab = dynamic(() => import("@/components/empresas/InfoTab"), {
  loading: () => <TabLoading />,
});

const AfiliacionesTab = dynamic(
  () => import("@/components/empresas/AfiliacionesTab"),
  { loading: () => <TabLoading /> }
);

const UsuariosSucursalesTab = dynamic(
  () => import("@/components/empresas/UsuariosSucursalesTab"),
  { loading: () => <TabLoading /> }
);

export default function ConfigurarEmpresaPage() {
  const params = useParams<{ usuario: string; id: string }>();
  const search = useSearchParams();

  const empresaId = Number(params.id);
  const tenant = search.get("tenant") || params.usuario;

  // ======= Estado base (mismos campos que CREAR) =======
  const [loading, setLoading] = useState(true);

  // Cabecera (4 datos + foto)
  const [razonSocial, setRazonSocial] = useState<RazonSocial>("Individual");
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [sector, setSector] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Solo 3 tabs: info, afiliaciones, usuarios
  const [tab, setTab] = useState<
    "info" | "afiliaciones" | "usuarios"
  >("info");

  // Afiliaciones
  const [regimenIvaList, setRegimenIvaList] = useState<RegimenOption[]>([]);
  const [regimenIsrList, setRegimenIsrList] = useState<RegimenOption[]>([]);
  const [nomenList, setNomenList] = useState<NomenclaturaOption[]>([]);
  const [regimenIvaId, setRegimenIvaId] = useState<number | undefined>();
  const [regimenIsrId, setRegimenIsrId] = useState<number | undefined>();
  const [nomenclaturaId, setNomenclaturaId] = useState<number | undefined>();
  const [obligaciones, setObligaciones] = useState<ObligacionRow[]>([
    { id: crypto.randomUUID(), impuesto: "IVA" },
    { id: crypto.randomUUID(), impuesto: "ISR" },
    { id: crypto.randomUUID(), impuesto: "ISO" },
    { id: crypto.randomUUID(), impuesto: "Otro" },
  ]);

  // Info específica
  const [infoIndividual, setInfoIndividual] = useState<any>({
    dpi: "",
    versionDpi: "",
    fechaVencDpi: "",
    fechaNac: "",
    deptoNac: "",
    muniNac: "",
    genero: "",
    estadoCivil: "",
    nacionalidad: "Guatemalteca",
    comunidadLinguistica: "",
    actividadEconomica: "",
    camaraEmpresarial: "",
    gremial: "",
    profesion: "",
    colegioProfesionales: "",
    noColegiado: "",
    fechaColegiado: "",
    depto: "",
    muni: "",
    zona: "",
    grupoHabitacional: "",
    nombreGrupoHabitacional: "",
    vialidadNumero: "",
    numeroCasaDepto: "",
    apartadoPostal: "",
    direccionFiscalCompleta: "",
    telCel: "",
    companiaTel: "",
    correoPrincipal: "",
    correoAv: "",
    correoAdicional: "",
  });

  const [infoJuridico, setInfoJuridico] = useState<any>({
    numeroConstitucion: "",
    fechaInscripcionRM: "",
    tipoConstitucion: "",
    fechaConstitucion: "",
    docModificacionUrl: "",
    depto: "",
    muni: "",
    zona: "",
    grupoHabitacional: "",
    nombreGrupoHabitacional: "",
    vialidadNumero: "",
    numeroCasaDepto: "",
    apartadoPostal: "",
    direccionFiscalCompleta: "",
    telCel: "",
    companiaTel: "",
    correoPrincipal: "",
    correoAv: "",
    correoAdicional: "",
    representanteNombre: "",
    representanteNit: "",
    fechaNombramiento: "",
    cantidadTiempo: "",
    fechaInscripcionRegistro: "",
    fechaVencRegistro: "",
    tipoRepresentante: "",
    estadoRepresentante: "",
    notarioNombre: "",
    notarioNit: "",
  });

  // ========= Cargar listas base (IVA/ISR/Nomenclaturas) =========
  const reloadLists = useCallback(async () => {
    try {
      const [iva, isr, nom] = await Promise.all([
        fetch(`/api/regimen/iva?tenant=${tenant}`, {
          cache: "no-store",
          credentials: "include",
        }).then((r) => r.json()),
        fetch(`/api/regimen/isr?tenant=${tenant}`, {
          cache: "no-store",
          credentials: "include",
        }).then((r) => r.json()),
        fetch(`/api/nomenclaturas?tenant=${tenant}`, {
          cache: "no-store",
          credentials: "include",
        }).then((r) => r.json()),
      ]);

      // IVA
      setRegimenIvaList(
        (Array.isArray(iva?.data) ? iva.data : []).map((x: any) => ({
          id: typeof x.id === "number" ? x.id : x.idRegimen,
          regimenSistema:
            x.nombreRegimen ??
            x.regimenSistema ??
            x.nombreComun ??
            "",
          nombreComun: x.nombreComun ?? "",
        }))
      );

      // ISR
      setRegimenIsrList(
        (Array.isArray(isr?.data) ? isr.data : []).map((x: any) => ({
          id: typeof x.id === "number" ? x.id : x.idRegimen,
          regimenSistema:
            x.nombreRegimen ??
            x.regimenSistema ??
            x.nombreComun ??
            "",
          nombreComun: x.nombreComun ?? "",
        }))
      );

      // Nomenclaturas
      setNomenList(
        (Array.isArray(nom?.data) ? nom.data : []).map((x: any) => ({
          id: x.id,
          nombre: x.nombre,
        }))
      );
    } catch (e) {
      console.error(e);
      setRegimenIvaList([]);
      setRegimenIsrList([]);
      setNomenList([]);
    }
  }, [tenant]);

  useEffect(() => {
    reloadLists();
  }, [reloadLists]);

  // ========= Cargar empresa por id =========
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        const res = await fetch(`/api/empresas/${empresaId}?tenant=${tenant}`, {
          cache: "no-store",
          credentials: "include",
        });
        const raw = await res.json();
        const data = raw?.data ?? raw; // soporta {ok,data} o directo

        const e = data || {};
        if (!alive) return;

        setNombre(String(e.nombre ?? ""));
        setNit(String(e.nit ?? ""));
        setSector(String(e.sectorEconomico ?? e.sector ?? ""));
        setRazonSocial((e.razonSocial as RazonSocial) || "Individual");
        setAvatarUrl(e.avatarUrl ?? null);

        // Info: puede venir como infoIndividual/infoJuridico o como "info" con tipo/objeto
        if (e.infoIndividual) setInfoIndividual(e.infoIndividual);
        if (e.infoJuridico) setInfoJuridico(e.infoJuridico);
        if (e.info && e.info.tipo === "Individual") setInfoIndividual(e.info);
        if (e.info && e.info.tipo === "Juridico") setInfoJuridico(e.info);

        // Afiliaciones
        const afi = e.afiliaciones || {};
        setRegimenIvaId(afi.regimenIvaId ?? undefined);
        setRegimenIsrId(afi.regimenIsrId ?? undefined);
        setNomenclaturaId(afi.nomenclaturaId ?? undefined);

        if (Array.isArray(afi.obligaciones) && afi.obligaciones.length > 0) {
          setObligaciones(
            afi.obligaciones.map((o: any) => ({
              id: String(o.id ?? crypto.randomUUID()),
              impuesto: String(o.impuesto ?? "Otro"),
              codigoFormulario: o.codigoFormulario ?? "",
              fechaPresentacion: o.fechaPresentacion ?? "",
              nombreObligacion: o.nombreObligacion ?? "",
            }))
          );
        }
      } catch (err) {
        console.error("load empresa error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [empresaId, tenant]);

  // ========= Guardar (PUT) =========
  const coreValid = !!(
    nombre.trim() &&
    nit.trim() &&
    sector.trim() &&
    (razonSocial === "Individual" || razonSocial === "Juridico")
  );

  const onGuardar = async () => {
    if (!coreValid) {
      alert("Completa Nombre, NIT, Sector Económico y Razón Social.");
      return;
    }

    const payload = {
      tenant,
      nombre,
      nit,
      sectorEconomico: sector,
      razonSocial,
      avatarUrl,
      afiliaciones: {
        regimenIvaId,
        regimenIsrId,
        obligaciones,
        nomenclaturaId,
      },
      // Ya no enviamos gestiones ni cuentas bancarias desde aquí
      info:
        razonSocial === "Individual"
          ? { tipo: "Individual", ...infoIndividual }
          : { tipo: "Juridico", ...infoJuridico },
    };

    const res = await fetch(`/api/empresas/${empresaId}?tenant=${tenant}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(await res.text());
      alert("No se pudo guardar la empresa.");
      return;
    }

    alert("Cambios guardados.");
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      <EmpresaSidebar
        empresaId={empresaId}
        forceUsuario={String(params.usuario)}
      />

      <main className="flex-1 p-6 lg:p-10 bg-white relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="rounded-xl px-6 py-4 bg-white shadow text-neutral-700">
              Estamos cargando tu entorno…
            </div>
          </div>
        )}

        <div className="max-w-[1100px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h1 className="text-4xl font-bold">Configurar empresa</h1>
            <button
              onClick={onGuardar as any}
              disabled={!coreValid}
              className={`rounded-xl px-5 py-2 text-white shadow ${
                coreValid
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-blue-300 cursor-not-allowed"
              }`}
            >
              Guardar Cambios
            </button>
          </div>

          {/* Cabecera 4 campos + foto */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">
            {/* Foto */}
            <div className="flex flex-col items-center">
              <div className="w-[160px] h-[160px] rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-neutral-500">Foto de perfil</span>
                )}
              </div>
            </div>

            {/* 4 campos */}
            <div className="grid grid-cols-1 gap-4">
              <Field label="Nombre de empresa:">
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </Field>
              <Field label="NIT:">
                <Input
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                />
              </Field>
              <Field label="Sector Económico:">
                <Input
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                />
              </Field>
              <Field label="Razón Social:">
                <Select
                  value={razonSocial}
                  onChange={(e) =>
                    setRazonSocial(e.target.value as RazonSocial)
                  }
                >
                  <Option value="Individual" label="Individual" />
                  <Option value="Juridico" label="Jurídico" />
                </Select>
              </Field>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 border-t pt-6">
            <div className="flex flex-wrap gap-3">
              {[
                ["info", "Información General y específica"],
                ["afiliaciones", "Afiliaciones"],
                ["usuarios", "Usuarios y Sucursales"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id as any)}
                  className={`px-4 py-1.5 rounded-lg border ${
                    tab === id
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-neutral-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-8">
              {tab === "info" && (
                <InfoTab
                  razonSocial={razonSocial}
                  infoIndividual={infoIndividual}
                  setInfoIndividual={setInfoIndividual}
                  infoJuridico={infoJuridico}
                  setInfoJuridico={setInfoJuridico}
                />
              )}

              {tab === "afiliaciones" && (
                <AfiliacionesTab
                  Field={Field}
                  Select={Select}
                  Input={Input}
                  regimenIvaList={regimenIvaList}
                  regimenIsrList={regimenIsrList}
                  nomenList={nomenList}
                  regimenIvaId={regimenIvaId}
                  setRegimenIvaId={setRegimenIvaId}
                  regimenIsrId={regimenIsrId}
                  setRegimenIsrId={setRegimenIsrId}
                  nomenclaturaId={nomenclaturaId}
                  setNomenclaturaId={setNomenclaturaId}
                  obligaciones={obligaciones}
                  setObligaciones={setObligaciones}
                  onReloadLists={reloadLists}
                />
              )}

              {tab === "usuarios" && <UsuariosSucursalesTab />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
