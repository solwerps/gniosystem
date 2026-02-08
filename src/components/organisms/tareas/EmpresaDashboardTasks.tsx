"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Plus, Trash2 } from "lucide-react";

type TaskEstado = "PRIORIDAD" | "PENDIENTE" | "EN_TRABAJO" | "REALIZADO";

type Tarea = {
  id: number;
  titulo: string;
  estado: TaskEstado;
  tipo?: string | null;
  fecha?: string | null;
  recordatorio: boolean;
  empresa?: string | null;
};

const ALERT_STATES = new Set<TaskEstado>(["PRIORIDAD", "PENDIENTE", "EN_TRABAJO"]);

interface EmpresaDashboardTasksProps {
  tenantSlug: string;
  empresaNombre: string;
}

export default function EmpresaDashboardTasks({
  tenantSlug,
  empresaNombre,
}: EmpresaDashboardTasksProps) {
  const [rows, setRows] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ---- Toasts ----
  const [toasts, setToasts] = useState<{ id: string; title: string; body: string }[]>([]);
  function pushToast(title: string, body: string) {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
  }
  function dismissToast(id: string) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  // ---- Draft "nueva tarea" ----
  const emptyDraft = {
    titulo: "",
    estado: "PENDIENTE" as TaskEstado,
    tipo: "",
    fecha: "",
    recordatorio: false,
  };
  const [draft, setDraft] = useState({ ...emptyDraft });
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // ---- Estado dropdown ----
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
  } as const;

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
          onClick={() => setOpenDropdown(isOpen ? null : taskId)}
          className={`w-full px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm ${config.bg} ${config.hoverBg} ${config.textColor} ring-2 ${config.ringColor} ring-opacity-20`}
        >
          <Icon className="w-4 h-4" />
          <span>{config.label}</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-md shadow-2xl border border-slate-200 overflow-hidden z-50 animate-dropdown">
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
                  className={`w-full px-3 py-2 flex items-center gap-2 text-xs transition-colors ${
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
  };

  // ---------- Utils ----------
  function normalizeEmpresa(value?: string | null) {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function isoToLocalYMD(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function ymdToStableISO(ymd: string) {
    return ymd ? `${ymd}T12:00:00.000Z` : null;
  }

  // ---------- API helpers ----------
  async function apiCreate(t: Partial<Tarea>) {
    const res = await fetch(`/api/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tenant: tenantSlug, tarea: t }),
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
      body: JSON.stringify({ tenant: tenantSlug, id, patch }),
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
      body: JSON.stringify({ tenant: tenantSlug, id }),
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

  // ---------- Notificaciones ----------
  async function ensureNotifPermission() {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    try {
      const p = await Notification.requestPermission();
      return p === "granted";
    } catch {
      return false;
    }
  }
  function prettyEstado(e: TaskEstado) {
    switch (e) {
      case "PRIORIDAD":
        return "Prioridad";
      case "PENDIENTE":
        return "Pendiente";
      case "EN_TRABAJO":
        return "En trabajo";
      case "REALIZADO":
        return "Finalizado";
      default:
        return e;
    }
  }
  function buildBody(t: Tarea) {
    return (
      `Tarea: ${t.titulo || "(sin titulo)"}\n` +
      `Tipo: ${t.tipo || "-"}\n` +
      `Empresa: ${t.empresa || empresaNombre || "-"}\n` +
      `Estado: ${prettyEstado(t.estado)}  -  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "-"}`
    );
  }
  function notifyImmediate(t: Tarea) {
    if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
    const now = new Date();
    const ymdNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    if (t.fecha) {
      const ymdTask = isoToLocalYMD(t.fecha);
      if (ymdTask > ymdNow) return;
    }
    const body = buildBody(t);
    pushToast("Recordatorio GNIO", body);
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Recordatorio GNIO", { body });
      } catch {}
    }
  }

  // ---------- Ordenamiento ----------
  const estadoRank: Record<TaskEstado, number> = {
    PRIORIDAD: 0,
    PENDIENTE: 1,
    EN_TRABAJO: 2,
    REALIZADO: 3,
  };
  function cmpByDate(a?: string | null, b?: string | null) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  }
  function applySort(arr: Tarea[]): Tarea[] {
    return [...arr].sort((x, y) => {
      const er = estadoRank[x.estado] - estadoRank[y.estado];
      if (er !== 0) return er;
      const dr = cmpByDate(x.fecha, y.fecha);
      if (dr !== 0) return dr;
      return (x.titulo || "").localeCompare(y.titulo || "");
    });
  }

  // ---------- Cargar tareas del usuario y filtrar por empresa ----------
  useEffect(() => {
    if (!tenantSlug || !empresaNombre) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tareas?tenant=${encodeURIComponent(tenantSlug)}`, {
          cache: "no-store",
          credentials: "include",
        });
        const j = await res.json();
        const all = Array.isArray(j?.data) ? (j.data as Tarea[]) : [];
        const target = normalizeEmpresa(empresaNombre);
        const filtered = all.filter((t) => normalizeEmpresa(t.empresa) === target);
        if (!alive) return;
        setRows(applySort(filtered));
      } catch (err: any) {
        if (!alive) return;
        setRows([]);
        pushToast("Error", err?.message || "No se pudieron cargar las tareas.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tenantSlug, empresaNombre]);

  // ---------- Acciones UI ----------
  async function createFromDraft() {
    const titulo = draft.titulo.trim();
    if (!titulo) {
      pushToast("Tarea incompleta", "Escribe un título antes de agregarla a la lista.");
      return;
    }

    try {
      const payload: Partial<Tarea> = {
        titulo,
        estado: draft.estado,
        tipo: draft.tipo || "",
        fecha: draft.fecha ? ymdToStableISO(draft.fecha) : null,
        recordatorio: !!draft.recordatorio,
        empresa: empresaNombre,
      };
      const created = await apiCreate(payload);
      if (normalizeEmpresa(created.empresa) !== normalizeEmpresa(empresaNombre)) return;
      setRows((curr) => applySort([created, ...curr]));
      setDraft({ ...emptyDraft });
      pushToast("Tarea creada", `Se agregó:\n${created.titulo}`);
      setTimeout(() => {
        const el = inputRefs.current[created.id];
        el?.focus();
      }, 0);
    } catch (err: any) {
      pushToast("Error", err?.message || "No se pudo crear la tarea");
    }
  }

  async function delRow(row: Tarea) {
    if (!row.titulo || !row.titulo.trim()) return;
    if (!confirm("¿Estas seguro que quieres borrar esta tarea?")) return;
    try {
      await apiDelete(row.id);
      setRows((r) => r.filter((x) => x.id !== row.id));
      pushToast("Tarea eliminada", row.titulo);
    } catch (err: any) {
      pushToast("Error", err?.message || "No se pudo eliminar");
    }
  }

  async function patchRow(id: number, patch: Partial<Tarea>) {
    setSavingRow(id);
    try {
      const updated = await apiUpdate(id, patch);
      setRows((r) => applySort(r.map((x) => (x.id === id ? { ...x, ...updated } : x))));
    } catch (err: any) {
      pushToast("Error", err?.message || "No se pudieron guardar los cambios");
    } finally {
      setSavingRow(null);
    }
  }

  // ---------- Permiso + alerta al abrir ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      try {
        Notification.requestPermission().catch(() => {});
      } catch {}
    }
    rows.forEach((t) => {
      if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
      const body = buildBody(t);
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Pendientes GNIO", { body });
        } catch {}
      }
      pushToast("Pendientes GNIO", body);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Recordatorios cada hora ----------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const ymdNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;
      const hour = now.getHours();

      rows.forEach((t) => {
        if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
        if (t.fecha) {
          const ymdTask = isoToLocalYMD(t.fecha);
          if (ymdTask > ymdNow) return;
        }
        const key = `tremh:${t.id}:${ymdNow}:${hour}`;
        if (localStorage.getItem(key)) return;

        const body = buildBody(t);

        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("Pendientes GNIO", { body });
          } catch {}
        }
        pushToast("Pendientes GNIO", body);

        localStorage.setItem(key, "1");
      });
    }, 60_000);

    return () => clearInterval(interval);
  }, [rows, empresaNombre]);

  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8 relative">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">LISTA DE TAREAS DEL MES</h2>
          <p className="text-slate-600">Agrega tus pendientes y recordatorios aquí</p>
        </div>
        <div className="text-sm text-slate-500">
          Empresa: <span className="font-semibold text-slate-700">{empresaNombre}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Cargando tareas...</div>
      ) : (
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
                </tr>
              </thead>
            <tbody>
              {/* Fila nueva */}
              <tr className="bg-blue-50 border-b-2 border-blue-200">
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
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
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
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
                <td className="px-4 py-3">
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
                    className={`w-full px-3 py-2 border-2 rounded-lg font-medium transition-all ${recordatorioColorClass(draft.recordatorio)}`}
                    value={draft.recordatorio ? "Si" : "No"}
                    onChange={(e) => setDraft((d) => ({ ...d, recordatorio: e.target.value === "Si" }))}
                  >
                    <option value="Si">Si</option>
                    <option value="No">No</option>
                  </select>
                </td>
              </tr>

              {rows.map((r) => {
                const canDelete = !!(r.titulo && r.titulo.trim());
                return (
                  <tr key={r.id} className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
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
                    <td className="px-4 py-3">
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
                        className={`w-full px-3 py-2 border-2 rounded-lg font-medium transition-all ${recordatorioColorClass(!!r.recordatorio)}`}
                        value={r.recordatorio ? "Si" : "No"}
                        onChange={async (e) => {
                          const val = e.target.value === "Si";
                          await ensureNotifPermission();
                          try {
                            await patchRow(r.id, { recordatorio: val });
                            notifyImmediate({ ...r, recordatorio: val } as Tarea);
                          } catch {
                            pushToast("Error", "No se pudo actualizar el recordatorio");
                          }
                        }}
                      >
                        <option value="Si">Si</option>
                        <option value="No">No</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="mt-3 text-sm text-slate-500">No hay tareas para esta empresa.</div>
      )}

      {savingRow && <div className="mt-3 text-xs text-slate-500">Guardando cambios...</div>}

      {toasts.length > 0 && (
        <div className="fixed right-4 bottom-4 z-50 space-y-2 w-[92vw] max-w-sm">
          {toasts.map((t) => (
            <div key={t.id} className="rounded-xl shadow-lg bg-slate-900 text-white p-3 border border-slate-700">
              <div className="flex items-start gap-3">
                <div className="text-lg">🔔</div>
                <div className="flex-1">
                  <div className="font-semibold leading-tight">{t.title}</div>
                  <div className="text-sm whitespace-pre-line opacity-90">{t.body}</div>
                  <div className="mt-2 text-xs opacity-70">
                    <button className="underline" onClick={() => dismissToast(t.id)}>
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
