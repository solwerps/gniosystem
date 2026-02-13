// src/app/dashboard/empresa/[usuario]/perfil/ProfileEmpresaClient.tsx
// ==============================

// ==============================
// File: src/app/dashboard/empresa/[usuario]/perfil/ProfileEmpresaClient.tsx
// ==============================
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Plus, Trash2, Bell, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type TaskEstado = "PRIORIDAD" | "PENDIENTE" | "EN_TRABAJO" | "REALIZADO";

type Tarea = {
  id: number;
  titulo: string;
  estado: TaskEstado;
  tipo?: string | null;
  fecha?: string | null; // ISO (guardamos T12:00:00Z para evitar desajustes)
  recordatorio: boolean;
  empresa?: string | null; // usado como Sucursal en UI
};

type UserView = {
  id: number;
  photoUrl?: string | null;
  role: "ADMIN" | "CONTADOR" | "EMPRESA";
  username: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  country?: string | null;
  address?: string | null;
  nit?: string | null;
  dpi?: string | null;
  appointmentDate?: string | null;
  prestationType?: string | null;
  status?: string | null;
};

// Estados que disparan alertas
const ALERT_STATES = new Set<TaskEstado>(["PRIORIDAD", "PENDIENTE", "EN_TRABAJO"]);

export default function ProfileEmpresaClient({
  usuarioSlug,
  user,
  tareas,
  tareasEmpresa,
}: {
  usuarioSlug: string;
  user: UserView;
  tareas: Tarea[];
  tareasEmpresa?: Tarea[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"PERFIL" | "ESPECIFICOS">("PERFIL");
  const [rows, setRows] = useState<Tarea[]>(tareas);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dropdownPanelRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
    transformOrigin?: string;
  } | null>(null);

  // Evita scroll del body cuando el dropdown esta abierto
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    if (openDropdown) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevBodyOverflow || "";
      document.documentElement.style.overflow = prevHtmlOverflow || "";
    }
    return () => {
      document.body.style.overflow = prevBodyOverflow || "";
      document.documentElement.style.overflow = prevHtmlOverflow || "";
    };
  }, [openDropdown]);

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    if (!openDropdown) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(`[data-estado-dropdown="${openDropdown}"]`)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [openDropdown]);

  useLayoutEffect(() => {
    if (!openDropdown) {
      setDropdownStyle(null);
      return;
    }

    const margin = 8;
    let rafId = 0;

    const computePosition = () => {
      const button = dropdownButtonRefs.current[openDropdown];
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const panel = dropdownPanelRef.current;
      const width = rect.width;

      let left = rect.left;
      const maxLeft = Math.max(margin, window.innerWidth - width - margin);
      left = Math.min(Math.max(margin, left), maxLeft);

      let top = rect.bottom + margin;
      let transformOrigin = "top";
      const panelHeight = panel?.offsetHeight ?? 0;
      if (panelHeight && top + panelHeight > window.innerHeight - margin) {
        top = rect.top - margin - panelHeight;
        transformOrigin = "bottom";
        if (top < margin) top = margin;
      }

      setDropdownStyle({ top, left, width, transformOrigin });
    };

    const schedule = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(computePosition);
    };

    schedule();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [openDropdown]);

  const estadoConfig = {
    PRIORIDAD: {
      label: "Prioridad",
      bg: "bg-gradient-to-r from-red-500 to-red-600",
      hoverBg: "hover:from-red-600 hover:to-red-700",
      icon: AlertCircle,
      textColor: "text-white",
      ringColor: "ring-red-400",
    },
    PENDIENTE: {
      label: "Pendiente",
      bg: "bg-gradient-to-r from-amber-500 to-amber-600",
      hoverBg: "hover:from-amber-600 hover:to-amber-700",
      icon: Clock,
      textColor: "text-white",
      ringColor: "ring-amber-400",
    },
    EN_TRABAJO: {
      label: "En trabajo",
      bg: "bg-gradient-to-r from-blue-500 to-blue-600",
      hoverBg: "hover:from-blue-600 hover:to-blue-700",
      icon: Clock,
      textColor: "text-white",
      ringColor: "ring-blue-400",
    },
    REALIZADO: {
      label: "Finalizado",
      bg: "bg-gradient-to-r from-green-500 to-green-600",
      hoverBg: "hover:from-green-600 hover:to-green-700",
      icon: CheckCircle2,
      textColor: "text-white",
      ringColor: "ring-green-400",
    },
  };

  // ---- Toasts ----
  const [toasts, setToasts] = useState<{ id: string; title: string; body: string }[]>([]);
  function pushToast(title: string, body: string) {
    const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    setToasts((t) => [...t, { id, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
  }
  function dismissToast(id: string) { setToasts((t) => t.filter((x) => x.id !== id)); }

  // ---- Draft "nueva tarea" ----
  const emptyDraft = {
    titulo: "",
    estado: "PENDIENTE" as TaskEstado,
    tipo: "",
    fecha: "",
    recordatorio: false,
    empresa: "", // UI: Sucursal
  };
  const [draft, setDraft] = useState({ ...emptyDraft });
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // ---------- Utils fecha ----------
  function isoToLocalYMD(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function ymdToStableISO(ymd: string) { return ymd ? `${ymd}T12:00:00.000Z` : null; }

  // ---------- API helpers (con credenciales) ----------
  async function apiCreate(t: Partial<Tarea>) {
    const res = await fetch(`/api/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tenant: usuarioSlug, tarea: t }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "No se pudo crear tarea");
    return j.data as Tarea;
  }
  async function apiUpdate(id: number, patch: Partial<Tarea>) {
    const res = await fetch(`/api/tareas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tenant: usuarioSlug, id, patch }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "No se pudo actualizar");
    return j.data as Tarea;
  }
  async function apiDelete(id: number) {
    const res = await fetch(`/api/tareas`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tenant: usuarioSlug, id }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "No se pudo eliminar");
  }

  // ---------- Estilos ----------
  function recordatorioColorClass(flag: boolean) {
    return flag
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-slate-50 text-slate-600 border-slate-200";
  }

  const renderEstadoBadge = (
    estado: TaskEstado,
    taskId: string,
    onChange: (newEstado: TaskEstado) => void
  ) => {
    const config = estadoConfig[estado];
    const Icon = config.icon;
    const isOpen = openDropdown === taskId;

    return (
      <div className={`relative ${isOpen ? "z-50" : ""}`} data-estado-dropdown={taskId}>
        <button
          type="button"
          ref={(el) => {
            dropdownButtonRefs.current[taskId] = el;
          }}
          onClick={() => setOpenDropdown(isOpen ? null : taskId)}
          className={`w-full px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm ${config.bg} ${config.hoverBg} ${config.textColor} ring-2 ${config.ringColor} ring-opacity-20`}
        >
          <Icon className="w-4 h-4" />
          <span>{config.label}</span>
        </button>

        {isOpen && (
          <div
            ref={dropdownPanelRef}
            style={dropdownStyle ?? undefined}
            className="fixed bg-white rounded-md shadow-2xl border-2 border-slate-200 overflow-hidden z-50 animate-dropdown"
          >
            {Object.entries(estadoConfig).map(([key, cfg]) => {
              const OptionIcon = cfg.icon;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => {
                    onChange(key as TaskEstado);
                    setOpenDropdown(null);
                  }}
                  className={`w-full px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                    key === estado ? "bg-blue-50 font-semibold" : "hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md ${cfg.bg} flex items-center justify-center`}>
                    <OptionIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-slate-700">{cfg.label}</span>
                    {key === estado && <CheckCircle2 className="w-4 h-4 text-blue-600 ml-auto" />}
                  </button>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  // ---------- Notificaciones ----------
  async function ensureNotifPermission() {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    try { return (await Notification.requestPermission()) === "granted"; } catch { return false; }
  }
  function prettyEstado(e: TaskEstado) {
    switch (e) {
      case "PRIORIDAD": return "Prioridad";
      case "PENDIENTE": return "Pendiente";
      case "EN_TRABAJO": return "En trabajo";
      case "REALIZADO": return "Finalizado";
      default: return e;
    }
  }
  function notifyImmediate(t: Tarea) {
    // Solo estados activos y hoy/vencidas/sin fecha y CON recordatorio=Si
    if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
    const now = new Date();
    const ymdNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (t.fecha) { const ymdTask = isoToLocalYMD(t.fecha); if (ymdTask > ymdNow) return; }
    const body = `Tarea: ${t.titulo || "(sin título)"}\nTipo: ${t.tipo || "—"}\nSucursal: ${t.empresa || "—"}\nEstado: ${prettyEstado(t.estado)}  ·  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "—"}`;
    pushToast("Recordatorio GNIO", body);
    if ("Notification" in window && Notification.permission === "granted") { try { new Notification("Recordatorio GNIO", { body }); } catch {} }
  }

  // ---------- Ordenamiento ----------
  const estadoRank: Record<TaskEstado, number> = { PRIORIDAD: 0, PENDIENTE: 1, EN_TRABAJO: 2, REALIZADO: 3 };
  function cmpByDate(a?: string | null, b?: string | null) {
    if (!a && !b) return 0; if (!a) return 1; if (!b) return -1; return new Date(a).getTime() - new Date(b).getTime();
  }
  function applySort(arr: Tarea[]): Tarea[] {
    return [...arr].sort((x, y) => {
      const er = estadoRank[x.estado] - estadoRank[y.estado]; if (er !== 0) return er;
      const dr = cmpByDate(x.fecha, y.fecha); if (dr !== 0) return dr;
      return (x.titulo || '').localeCompare(y.titulo || '');
    });
  }

  // ---------- Acciones UI ----------
  async function createFromDraft() {
    const titulo = draft.titulo.trim();
    if (!titulo) { pushToast("Tarea incompleta", "Escribe un título antes de agregarla a la lista."); return; }
    try {
      const payload: Partial<Tarea> = {
        titulo,
        estado: draft.estado,
        tipo: draft.tipo || "",
        fecha: draft.fecha ? ymdToStableISO(draft.fecha) : null,
        recordatorio: !!draft.recordatorio,
        empresa: draft.empresa || "", // UI: Sucursal
      };
      const created = await apiCreate(payload);
      setRows((curr) => applySort([created, ...curr]));
      setDraft({ ...emptyDraft });
      await ensureNotifPermission();
      pushToast("Creaste la tarea", `Tarea: ${created.titulo}\nEstado: ${prettyEstado(created.estado)}\nFecha: ${created.fecha ? isoToLocalYMD(created.fecha) : "—"}\nRecordatorio: ${created.recordatorio ? "Si" : "No"}`);
      setTimeout(() => { const el = inputRefs.current[created.id]; el?.focus(); }, 0);
      // refrescar server components (por si esta vista se rehidrata desde DB)
      router.refresh();
    } catch (err: any) {
      pushToast("Error", err?.message || "No se pudo crear la tarea");
    }
  }

  async function delRow(row: Tarea) {
    if (!row.titulo || !row.titulo.trim()) return;
    if (!confirm("¿Estas seguro que quieres borrar esta tarea?")) return;
    try { await apiDelete(row.id); setRows((r) => r.filter((x) => x.id !== row.id)); router.refresh(); pushToast("Tarea eliminada", row.titulo); }
    catch (err: any) { pushToast("Error", err?.message || "No se pudo eliminar"); }
  }

  async function patchRow(id: number, patch: Partial<Tarea>) {
    setSavingRow(id);
    try {
      const updated = await apiUpdate(id, patch);
      setRows((r) => applySort(r.map((x) => (x.id === id ? { ...x, ...updated } : x))));
      router.refresh();
    } catch (err: any) { pushToast("Error", err?.message || "No se pudieron guardar los cambios"); }
    finally { setSavingRow(null); }
  }

  // ---------- Permiso de notificaciones y alertas al abrir ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") { try { Notification.requestPermission().catch(() => {}); } catch {} }
    // Aviso al abrir (estados activos)
    const now = new Date();
    const ymdNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    rows.forEach((t) => {
      if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
      const body = `Tarea: ${t.titulo || "(sin título)"}\nTipo: ${t.tipo || "—"}\nSucursal: ${t.empresa || "—"}\nEstado: ${prettyEstado(t.estado)}  ·  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "—"}`;
      if ("Notification" in window && Notification.permission === "granted") { try { new Notification("Pendientes GNIO", { body }); } catch {} }
      pushToast("Pendientes GNIO", body);
    });

    // Aviso al abrir para tareas asignadas a esta empresa (desde contador)
    const rowIds = new Set(rows.map((t) => t.id));
    (tareasEmpresa ?? []).forEach((t) => {
      if (rowIds.has(t.id)) return;
      if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
      const body = `Tarea: ${t.titulo || "(sin título)"}\nTipo: ${t.tipo || "—"}\nEmpresa: ${t.empresa || "—"}\nEstado: ${prettyEstado(t.estado)}  ·  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "—"}`;
      if ("Notification" in window && Notification.permission === "granted") { try { new Notification("Pendientes GNIO", { body }); } catch {} }
      pushToast("Pendientes GNIO", body);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Recordatorios cada hora (dedupe por hora) ----------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const ymdNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const hour = now.getHours();
      rows.forEach((t) => {
        if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
        if (t.fecha) { const ymdTask = isoToLocalYMD(t.fecha); if (ymdTask > ymdNow) return; }
        const key = `tremh:${t.id}:${ymdNow}:${hour}`;
        if (localStorage.getItem(key)) return;
        const body = `Tarea: ${t.titulo || "(sin título)"}\nTipo: ${t.tipo || "—"}\nSucursal: ${t.empresa || "—"}\nEstado: ${prettyEstado(t.estado)}  ·  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "—"}`;
        if ("Notification" in window && Notification.permission === "granted") { try { new Notification("Pendientes GNIO", { body }); } catch {} }
        pushToast("Pendientes GNIO", body);
        localStorage.setItem(key, "1");
      });
    }, 60_000); // corre cada minuto, notifica máx 1 vez por hora por tarea
    return () => clearInterval(interval);
  }, [rows]);

  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8 relative">
      {/* Tabs + Editar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setTab("PERFIL")} className={`px-4 py-2 rounded-full font-semibold ${tab === "PERFIL" ? "bg-slate-300 text-black" : "hover:bg-slate-100"}`}>DATOS DEL PERFIL</button>
          <span className="text-slate-400 font-semibold">|</span>
          <button onClick={() => setTab("ESPECIFICOS")} className={`px-4 py-2 rounded-full font-semibold ${tab === "ESPECIFICOS" ? "bg-slate-300 text-black" : "hover:bg-slate-100"}`}>ESPECIFICOS DEL PERFIL</button>
        </div>
        <a href={`/dashboard/empresa/${usuarioSlug}/perfil/editar`} className="px-4 py-2 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700">EDITAR PERFIL</a>
      </div>

      {/* Panel superior (foto + datos/específicos) */}
      <ProfileHeader tab={tab} user={user} />

      <hr className="my-4" />

      {/* LISTA DE TAREAS */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          LISTA DE TAREAS DEL MES
        </h2>
        <p className="text-slate-600">Agrega tus pendientes y recordatorios aquí</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-visible">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                <th className="px-4 py-4 text-left text-sm font-semibold text-white w-24">Añadir</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-white w-24">Borrar</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-white min-w-[250px]">Tarea</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-white w-40">Estado</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-white w-48">Tipo</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-white w-40">Fecha</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-white w-36">Recordatorio</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-white min-w-[220px]">Sucursal</th>
              </tr>
            </thead>
            <tbody>
            {/* Fila NUEVA */}
            <tr className="bg-blue-50 border-b-2 border-blue-200">
              <td className="px-4 py-3">
                <button
                  onClick={createFromDraft}
                  disabled={!draft.titulo.trim()}
                  className={`w-full px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    draft.titulo.trim()
                      ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                  title="Añadir tarea"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </td>
              <td className="px-4 py-3">
                <button
                  disabled
                  className="w-full px-4 py-2 rounded-lg bg-slate-100 text-slate-300 cursor-not-allowed flex items-center justify-center"
                  title="Borrar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
              <td className="px-4 py-3">
                <input
                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={draft.titulo}
                  onChange={(e) => setDraft((d) => ({ ...d, titulo: e.target.value }))}
                  placeholder="Nueva tarea"
                />
              </td>
              <td className="px-4 py-3 relative">
                {renderEstadoBadge(draft.estado, "draft", (newEstado) =>
                  setDraft((d) => ({ ...d, estado: newEstado }))
                )}
              </td>
              <td className="px-4 py-3">
                <input
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={draft.tipo}
                  onChange={(e) => setDraft((d) => ({ ...d, tipo: e.target.value }))}
                  placeholder="Subir facturas / IVA / ..."
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="date"
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={draft.fecha}
                  onChange={(e) => setDraft((d) => ({ ...d, fecha: e.target.value }))}
                />
              </td>
              <td className="px-4 py-3">
                <select
                  className={`w-full px-3 py-2 border-2 rounded-lg font-medium transition-all ${recordatorioColorClass(
                    draft.recordatorio
                  )}`}
                  value={draft.recordatorio ? "Si" : "No"}
                  onChange={(e) => setDraft((d) => ({ ...d, recordatorio: e.target.value === "Si" }))}
                >
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <select
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={draft.empresa}
                  onChange={(e) => setDraft((d) => ({ ...d, empresa: e.target.value }))}
                >
                  <option value="">Seleccionar sucursal</option>
                  <option value="Central">Central</option>
                  <option value="Norte">Norte</option>
                  <option value="Sur">Sur</option>
                </select>
              </td>
            </tr>

            {/* Filas existentes */}
            {rows.map((r) => {
              const canDelete = !!(r.titulo && r.titulo.trim());
              return (
                <tr key={r.id} className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3">
                    <button
                      onClick={() => canDelete && delRow(r)}
                      disabled={!canDelete}
                      className={`w-full px-4 py-2 rounded-lg transition-all flex items-center justify-center ${
                        canDelete
                          ? "bg-red-50 text-red-600 hover:bg-red-100 border-2 border-red-200"
                          : "bg-slate-100 text-slate-300 cursor-not-allowed border-2 border-slate-200"
                      }`}
                      title="Eliminar tarea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      ref={(el) => (inputRefs.current[r.id] = el)}
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                      value={r.titulo}
                      onChange={(e) =>
                        setRows((arr) => arr.map((x) => (x.id === r.id ? { ...x, titulo: e.target.value } : x)))
                      }
                      onBlur={(e) => patchRow(r.id, { titulo: e.currentTarget.value })}
                      placeholder="Describe la tarea..."
                    />
                  </td>
                  <td className="px-4 py-3 relative">
                    {renderEstadoBadge(r.estado, String(r.id), (newEstado) =>
                      patchRow(r.id, { estado: newEstado })
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={r.tipo ?? ""}
                      onChange={(e) =>
                        setRows((arr) => arr.map((x) => (x.id === r.id ? { ...x, tipo: e.target.value } : x)))
                      }
                      onBlur={(e) => patchRow(r.id, { tipo: e.currentTarget.value })}
                      placeholder="Subir facturas / IVA / ..."
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={isoToLocalYMD(r.fecha)}
                      onChange={async (e) => {
                        const v = e.target.value ? ymdToStableISO(e.target.value) : null;
                        await patchRow(r.id, { fecha: v });
                        notifyImmediate({ ...r, fecha: v } as Tarea);
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={`w-full px-3 py-2 border-2 rounded-lg font-medium transition-all ${recordatorioColorClass(
                        !!r.recordatorio
                      )}`}
                      value={r.recordatorio ? "Si" : "No"}
                      onChange={async (e) => {
                        const val = e.target.value === "Si";
                        await ensureNotifPermission();
                        // Optimistic UI
                        const prev = r.recordatorio;
                        setRows((arr) => arr.map((x) => (x.id === r.id ? { ...x, recordatorio: val } : x)));
                        try {
                          await patchRow(r.id, { recordatorio: val });
                          notifyImmediate({ ...r, recordatorio: val } as Tarea);
                        } catch {
                          setRows((arr) => arr.map((x) => (x.id === r.id ? { ...x, recordatorio: prev } : x)));
                          pushToast("Error", "No se pudo actualizar el recordatorio");
                        }
                      }}
                    >
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={r.empresa ?? ""}
                      onChange={(e) => patchRow(r.id, { empresa: e.target.value })}
                    >
                      <option value="">Seleccionar sucursal</option>
                      <option value="Central">Central</option>
                      <option value="Norte">Norte</option>
                      <option value="Sur">Sur</option>
                    </select>
                  </td>
                </tr>
              );
            })}
              </tbody>
            </table>
          </div>
        </div>


      {savingRow && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          Guardando cambios...
        </div>
      )}

      {/* Toasts visuales */}
      {toasts.length > 0 && (
        <div className="fixed right-4 bottom-4 z-50 space-y-3 w-[92vw] max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="rounded-xl shadow-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 border-2 border-blue-400 animate-slide-in"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold leading-tight mb-1">{t.title}</div>
                  <div className="text-sm opacity-90 whitespace-pre-line">{t.body}</div>
                  <div className="mt-2">
                    <button className="text-sm font-medium underline hover:no-underline" onClick={() => dismissToast(t.id)}>
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        @keyframes dropdown {
          from {
            transform: translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-dropdown {
          animation: dropdown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

function ProfileHeader({ tab, user }: { tab: "PERFIL" | "ESPECIFICOS"; user: UserView }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="rounded-2xl bg-slate-100 h-48 grid place-items-center text-slate-500 overflow-hidden">
        {user.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoUrl} alt="Foto de perfil" className="w-full h-48 object-cover rounded-2xl" />
        ) : (
          "Foto de perfil"
        )}
      </div>

      {tab === "PERFIL" ? (
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre" value={user.name} />
          <Field label="Usuario" value={user.username} />
          <Field label="Correo" value={user.email} />
          <Field label="Celular" value={user.phone} />
          <Field label="País" value={user.country} />
          <Field label="Dirección" value={user.address} />
        </div>
      ) : (
        // ESPECÍFICOS PARA EMPRESA (como pediste):
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre de la empresa" value={user.companyName} />
          <Field label="NIT" value={user.nit} />
          <Field label="DPI" value={user.dpi} />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}:</div>
      <div className="font-medium">{value || "-"}</div>
    </div>
  );
}
