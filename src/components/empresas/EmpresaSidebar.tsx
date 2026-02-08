// src/components/empresas/EmpresaSidebar.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  FolderOpen, 
  FileText, 
  Book, 
  BarChart3, 
  Package 
} from "lucide-react";

type Features = {
  documentos: { label: string; href: string }[];
  reportes: { href: string; caps?: any } | null;
  inventarios: { href: string } | null;
  libros: { href: string } | null;
  estados: { href: string } | null;
  conciliacion: { href: string } | null;
  asientos: { href: string; crear: string } | null;
};

type EntornoData = {
  empresaId: number;
  empresaNombre: string;
  features: Features;
  raw?: {
    flags?: Record<string, boolean>;
    nombreIva?: string;
    nombreIsr?: string;
  };
};

type EntornoResponse = {
  ok: boolean;
  data: EntornoData;
};

export default function EmpresaSidebar({
  empresaId,
  forceUsuario,
}: {
  empresaId: number;
  forceUsuario: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const tenant = search.get("tenant") || forceUsuario;

  const [loading, setLoading] = useState(true);
  const [entorno, setEntorno] = useState<EntornoData | null>(null);

  // Estados de colapsables
  const [openDocs, setOpenDocs] = useState(true);
  const [openLibros, setOpenLibros] = useState(true);
  const [openAsientos, setOpenAsientos] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/empresas/${empresaId}/entorno?tenant=${tenant}`,
          { cache: "no-store" }
        );
        const payload: EntornoResponse = await res.json();
        if (!alive) return;
        setEntorno(payload.data);
      } catch {
        if (!alive) return;
        setEntorno(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [empresaId, tenant]);

  const go = (sub: string) => {
    const qs = search.toString() ? `?${search.toString()}` : "";
    router.push(
      `/dashboard/contador/${tenant}/empresas/${empresaId}/${sub}${qs}`
    );
  };

  const goPlain = (path: string) => {
    const qs = search.toString() ? `?${search.toString()}` : "";
    router.push(`${path}${qs}`);
  };

  // Helpers de flags
  const F = entorno?.raw?.flags || {};
  const normalize = (value: string) =>
    (value ?? "")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .toLowerCase();

  const hasDocFacturas = !!F.presentaFacturas;
  const hasDocRetIVA = !!F.retencionIva;
  const hasDocRetISR = !!F.retencionIsr;

  const libroFlags = [
    F.libroCompras,
    F.libroVentas,
    F.libroDiario,
    F.libroDiarioDetalle,
    F.libroMayor,
    F.balanceGeneralEstadoResult,
  ].some(Boolean);

  const hasConciliacion = !!F.conciliacionBancaria;
  const hasInventarios = !!F.presentaInventarios;

  const nombreIva = normalize(entorno?.raw?.nombreIva ?? "");
  const nombreIsr = normalize(entorno?.raw?.nombreIsr ?? "");
  const ivaPermitido = ["primario", "pecuario", "iva general"].some((tipo) =>
    nombreIva.includes(tipo)
  );
  const isrPermitido = nombreIsr.includes("isr");
  const hasReportes =
    !!entorno?.features?.reportes && (ivaPermitido || isrPermitido);

  const docsEmpty = !hasDocFacturas && !hasDocRetIVA && !hasDocRetISR;
  const librosEmpty = !libroFlags && !hasConciliacion;

  return (
    <aside className="flex min-h-screen w-[280px] flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-slate-50 shadow-2xl border-r border-blue-900/30 motion-reduce:animate-none animate-[fade-up_0.5s_ease-out]">
      {/* Header elegante */}
      <div className="relative border-b border-blue-800/30 bg-gradient-to-r from-blue-900/40 to-transparent px-6 py-5 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
        <div className="relative">
          <h2 className="text-2xl font-bold tracking-[0.3em] text-blue-50 drop-shadow-lg">
            SECA
          </h2>
          <div className="mt-1 h-0.5 w-12 rounded-full bg-gradient-to-r from-blue-400 to-transparent"></div>
        </div>
      </div>

      {/* Navegación fija superior */}
      <div className="space-y-2 p-4 border-b border-blue-800/20">
        <button
          onClick={() => goPlain(`/dashboard/contador/${tenant}/empresas`)}
          className="group relative w-full overflow-hidden rounded-lg border border-blue-600/30 bg-gradient-to-r from-blue-800/30 to-blue-900/20 px-4 py-3 text-left text-sm font-medium text-blue-100 shadow-lg shadow-blue-900/10 transition-all hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/20 active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center gap-2">
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Regresar
          </span>
          <span className="absolute inset-0 bg-gradient-to-r from-blue-700/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></span>
        </button>

        <button
          onClick={() => go("")}
          className="group relative w-full overflow-hidden rounded-lg bg-blue-800/20 px-4 py-3 text-left text-sm font-medium text-blue-50 shadow-md transition-all hover:bg-blue-800/30 hover:shadow-lg active:scale-[0.98]"
        >
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover:opacity-100"></span>
          <span className="relative z-10 flex items-center gap-2 pl-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </span>
        </button>

        <button
          onClick={() => go("configurar")}
          className="group relative w-full overflow-hidden rounded-lg bg-blue-800/20 px-4 py-3 text-left text-sm font-medium text-blue-50 shadow-md transition-all hover:bg-blue-800/30 hover:shadow-lg active:scale-[0.98]"
        >
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover:opacity-100"></span>
          <span className="relative z-10 flex items-center gap-2 pl-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuraciones
          </span>
        </button>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-blue-800/50 scrollbar-track-transparent">
        
        {/* PARTIDA INICIAL */}
        <div className="animate-[fade-up_0.4s_ease-out]" style={{animationDelay: '0ms'}}>
          <button
            onClick={() => setOpenAsientos((v) => !v)}
            className={`group relative w-full overflow-hidden rounded-lg px-4 py-3 text-left text-sm font-semibold transition-all ${
              openAsientos 
                ? 'bg-blue-800/40 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-blue-800/20 text-blue-100 hover:bg-blue-800/30'
            }`}
          >
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-400 transition-opacity ${openAsientos ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
            
            <span className="relative z-10 flex items-center justify-between pl-1">
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                <span>Partida Inicial</span>
              </span>
              <svg 
                className={`w-4 h-4 text-blue-300 transition-transform duration-200 ${openAsientos ? 'rotate-180' : ''}`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </span>
          </button>

          <div
            className={`transition-all duration-300 overflow-hidden ${
              openAsientos ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="space-y-1.5 rounded-lg border border-blue-800/30 bg-gradient-to-br from-blue-950/40 to-slate-900/40 p-2 backdrop-blur-sm">
              <button
                onClick={() => go("asientos_contables")}
                className="group/item relative w-full overflow-hidden rounded-md bg-blue-900/20 px-4 py-2.5 text-left text-sm text-blue-100 transition-all hover:bg-blue-800/30 hover:text-white active:scale-[0.98]"
              >
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/item:opacity-100"></span>
                <span className="pl-2">Buscador de asientos</span>
              </button>
              
              <button
                onClick={() => go("asientos_contables/crear")}
                className="group/item relative w-full overflow-hidden rounded-md bg-blue-900/20 px-4 py-2.5 text-left text-sm text-blue-100 transition-all hover:bg-blue-800/30 hover:text-white active:scale-[0.98]"
              >
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/item:opacity-100"></span>
                <span className="pl-2">Asientos contables</span>
              </button>
              
              <button
                onClick={() => go("gestiones")}
                className="group/item relative w-full overflow-hidden rounded-md bg-blue-900/20 px-4 py-2.5 text-left text-sm text-blue-100 transition-all hover:bg-blue-800/30 hover:text-white active:scale-[0.98]"
              >
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/item:opacity-100"></span>
                <span className="pl-2">Gestiones de folios</span>
              </button>
              
              <button
                onClick={() => go("bancos")}
                className="group/item relative w-full overflow-hidden rounded-md bg-blue-900/20 px-4 py-2.5 text-left text-sm text-blue-100 transition-all hover:bg-blue-800/30 hover:text-white active:scale-[0.98]"
              >
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/item:opacity-100"></span>
                <span className="pl-2">Cuentas bancarias</span>
              </button>
            </div>
          </div>
        </div>

        {/* DOCUMENTOS */}
        <div className="animate-[fade-up_0.4s_ease-out]" style={{animationDelay: '50ms'}}>
          <button
            onClick={() => setOpenDocs((v) => !v)}
            className={`group relative w-full overflow-hidden rounded-lg px-4 py-3 text-left text-sm font-semibold transition-all ${
              openDocs 
                ? 'bg-blue-800/40 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-blue-800/20 text-blue-100 hover:bg-blue-800/30'
            }`}
          >
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-400 transition-opacity ${openDocs ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
            
            <span className="relative z-10 flex items-center justify-between pl-1">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Documentos</span>
              </span>
              <svg 
                className={`w-4 h-4 text-blue-300 transition-transform duration-200 ${openDocs ? 'rotate-180' : ''}`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </span>
          </button>

          <div
            className={`transition-all duration-300 overflow-hidden ${
              openDocs ? 'max-h-[400px] opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="space-y-1.5 rounded-lg border border-blue-800/30 bg-gradient-to-br from-blue-950/40 to-slate-900/40 p-2 backdrop-blur-sm">
              {loading && (
                <div className="flex items-center gap-2 px-4 py-2 text-sm text-blue-300">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cargando…
                </div>
              )}

              {!loading && docsEmpty && (
                <div className="px-4 py-3 text-sm text-blue-300/70 text-center">
                  No hay documentos habilitados
                </div>
              )}

              {!loading && hasDocFacturas && (
                <button
                  onClick={() => go("documentos")}
                  className="group/item relative w-full overflow-hidden rounded-md bg-blue-900/20 px-4 py-2.5 text-left text-sm text-blue-100 transition-all hover:bg-blue-800/30 hover:text-white active:scale-[0.98]"
                >
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/item:opacity-100"></span>
                  <span className="pl-2">Facturas</span>
                </button>
              )}
              
              {!loading && hasDocRetISR && (
                <button
                  onClick={() => go("documentos/retenciones/isr")}
                  className="group/item relative w-full overflow-hidden rounded-md bg-blue-900/20 px-4 py-2.5 text-left text-sm text-blue-100 transition-all hover:bg-blue-800/30 hover:text-white active:scale-[0.98]"
                >
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/item:opacity-100"></span>
                  <span className="pl-2">Retenciones ISR</span>
                </button>
              )}
              
              {!loading && hasDocRetIVA && (
                <button
                  onClick={() => go("documentos/retenciones/iva")}
                  className="group/item relative w-full overflow-hidden rounded-md bg-blue-900/20 px-4 py-2.5 text-left text-sm text-blue-100 transition-all hover:bg-blue-800/30 hover:text-white active:scale-[0.98]"
                >
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/item:opacity-100"></span>
                  <span className="pl-2">Retenciones IVA</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LIBROS */}
        <div className="animate-[fade-up_0.4s_ease-out]" style={{animationDelay: '100ms'}}>
          <button
            onClick={() => setOpenLibros((v) => !v)}
            className={`group relative w-full overflow-hidden rounded-lg px-4 py-3 text-left text-sm font-semibold transition-all ${
              openLibros 
                ? 'bg-blue-800/40 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-blue-800/20 text-blue-100 hover:bg-blue-800/30'
            }`}
          >
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-400 transition-opacity ${openLibros ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
            
            <span className="relative z-10 flex items-center justify-between pl-1">
              <span className="flex items-center gap-2">
                <Book className="w-4 h-4" />
                <span>Libros</span>
              </span>
              <svg 
                className={`w-4 h-4 text-blue-300 transition-transform duration-200 ${openLibros ? 'rotate-180' : ''}`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </span>
          </button>

          <div
            className={`transition-all duration-300 overflow-hidden ${
              openLibros ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="space-y-1.5 rounded-lg border border-blue-800/30 bg-gradient-to-br from-blue-950/40 to-slate-900/40 p-2 backdrop-blur-sm">
              {loading && (
                <div className="flex items-center gap-2 px-4 py-2 text-sm text-blue-300">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cargando…
                </div>
              )}

              {!loading && librosEmpty && (
                <div className="px-4 py-3 text-sm text-blue-300/70 text-center">
                  No hay libros habilitados
                </div>
              )}

              {!loading && libroFlags && (
                <button
                  onClick={() => go("libros")}
                  className="group/item relative w-full overflow-hidden rounded-md bg-blue-900/20 px-4 py-2.5 text-left text-sm text-blue-100 transition-all hover:bg-blue-800/30 hover:text-white active:scale-[0.98]"
                >
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/item:opacity-100"></span>
                  <span className="pl-2">Listado de Libros</span>
                </button>
              )}

              {!loading && hasConciliacion && (
                <button
                  onClick={() => go("libros/conciliacion")}
                  className="group/item relative w-full overflow-hidden rounded-md bg-blue-900/20 px-4 py-2.5 text-left text-sm text-blue-100 transition-all hover:bg-blue-800/30 hover:text-white active:scale-[0.98]"
                >
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/item:opacity-100"></span>
                  <span className="pl-2">Conciliación Bancaria</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BOTONES SUELTOS */}
        {!loading && hasReportes && (
          <button
            onClick={() => go("reportes")}
            className="group relative w-full overflow-hidden rounded-lg bg-blue-800/20 px-4 py-3 text-left text-sm font-semibold text-blue-50 shadow-md transition-all hover:bg-blue-800/30 hover:shadow-lg active:scale-[0.98] animate-[fade-up_0.4s_ease-out]"
            style={{animationDelay: '150ms'}}
          >
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover:opacity-100"></span>
            <span className="relative z-10 flex items-center gap-2 pl-1">
              <BarChart3 className="w-4 h-4" />
              <span>Reportes</span>
            </span>
          </button>
        )}

        {!loading && hasInventarios && (
          <button
            onClick={() => go("inventarios")}
            className="group relative w-full overflow-hidden rounded-lg bg-blue-800/20 px-4 py-3 text-left text-sm font-semibold text-blue-50 shadow-md transition-all hover:bg-blue-800/30 hover:shadow-lg active:scale-[0.98] animate-[fade-up_0.4s_ease-out]"
            style={{animationDelay: '200ms'}}
          >
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover:opacity-100"></span>
            <span className="relative z-10 flex items-center gap-2 pl-1">
              <Package className="w-4 h-4" />
              <span>Inventario</span>
            </span>
          </button>
        )}
      </div>

      {/* Footer con logout */}
      <div className="border-t border-blue-800/30 bg-gradient-to-r from-blue-900/20 to-transparent p-4 backdrop-blur-sm">
        <button
          onClick={() => goPlain("/login")}
          className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:shadow-xl hover:shadow-red-900/40 active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </span>
          <span className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 transition-opacity group-hover:opacity-100"></span>
        </button>
      </div>
    </aside>
  );
}
