// src/app/dashboard/contador/[usuario]/nomenclatura/crear/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import type { CuentaRow, Naturaleza, Tipo } from "@/types/nomenclatura";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const reindexRows = (arr: CuentaRow[]) =>
  arr.map((row, idx) => ({ ...row, orden: idx + 1 }));

// Helper para limpiar lo que se envía al backend
const mapRowsForApi = (arr: CuentaRow[]) =>
  reindexRows(arr).map((r) => ({
    orden: r.orden,
    cuenta: r.cuenta,
    descripcion: r.descripcion,
    debeHaber: r.debeHaber,
    principalDetalle: r.principalDetalle,
    nivel: Number(r.nivel),
    tipo: r.tipo,
    naturaleza: r.naturaleza,
    isPlantilla: !!r.isPlantilla,
  }));

// ====== Utilidades jerarquía ======
const ROOT_IDS = ["1", "2", "3", "4", "5", "6"] as const;
type RootId = (typeof ROOT_IDS)[number];

const rootLabel: Record<RootId, string> = {
  "1": "ACTIVO",
  "2": "PASIVO",
  "3": "CAPITAL",
  "4": "INGRESOS",
  "5": "COSTOS Y GASTOS",
  "6": "OTROS INGRESOS Y GASTOS",
};

// Colores para el botón Desplegar (tus colores)
const rootColors: Record<RootId, string> = {
  "1": "bg-green-600",
  "2": "bg-red-600",
  "3": "bg-amber-500",
  "4": "bg-sky-500",
  "5": "bg-fuchsia-600",
  "6": "bg-indigo-600",
};

// ¿Es una de las 6 cuentas raíz en nivel 1?
const isRootRow = (r: CuentaRow) =>
  Number(r.nivel) === 1 &&
  typeof r.cuenta === "string" &&
  ROOT_IDS.includes(r.cuenta as RootId);

// Primer dígito de una cuenta
const leadingDigit = (cuenta?: string) =>
  cuenta && /^\d/.test(cuenta) ? cuenta[0] : undefined;

// Incrementa un string numérico preservando longitud (120801 -> 120802)
const incrementCuenta = (s?: string) => {
  if (!s || !/^\d+$/.test(s)) return s ?? "";
  const len = s.length;
  const num = BigInt(s) + 1n;
  let out = num.toString();
  if (out.length < len) out = out.padStart(len, "0");
  return out;
};

// ====== util para detectar duplicados ======
const cuentasDuplicadas = (arr: CuentaRow[]) => {
  const counts = new Map<string, number>();
  for (const r of arr) {
    const key = String(r.cuenta ?? "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n > 1)
    .map(([k]) => k)
    .sort((a, b) => a.localeCompare(b));
};

export default function CrearNomenclaturaContador() {
  const router = useRouter();
  const { usuario } = useParams<{ usuario: string }>();

  const [rows, setRows] = useState<CuentaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Paginación sobre filas VISIBLES
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  // Expansión:
  //  - raíz (nivel 1) -> muestra nivel 2
  //  - nivel 2 -> muestra nivel 3
  //  - nivel 3 -> muestra nivel 4
  const [expandedRoots, setExpandedRoots] = useState<Record<RootId, boolean>>({
    "1": false,
    "2": false,
    "3": false,
    "4": false,
    "5": false,
    "6": false,
  });
  const [expandedNivel2, setExpandedNivel2] = useState<Set<string>>(
    () => new Set()
  );
  const [expandedNivel3, setExpandedNivel3] = useState<Set<string>>(
    () => new Set()
  );

  // ===== Cargar PLANTILLA (semilla) =====
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/nomenclaturas/plantilla", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await res.json();
        const list: any[] = Array.isArray(payload?.cuentas)
          ? payload.cuentas
          : Array.isArray(payload?.data?.cuentas)
          ? payload.data.cuentas
          : Array.isArray(payload)
          ? payload
          : [];

        const normalizadas: CuentaRow[] = list.map((r: any, i: number) => ({
          orden: Number(r.orden ?? i + 1),
          cuenta: String(r.cuenta ?? ""),
          descripcion: String(r.descripcion ?? ""),
          debeHaber: (r.debeHaber ?? "DEBE") as "DEBE" | "HABER",
          principalDetalle: (r.principalDetalle ?? "P") as "P" | "D",
          nivel: Number(r.nivel ?? 1),
          tipo: (r.tipo ?? "BALANCE_GENERAL") as Tipo,
          naturaleza: (r.naturaleza ?? "REVISAR") as Naturaleza,
          isPlantilla: !!r.isPlantilla,

          lockCuenta: !!r.lockCuenta,
          lockDescripcion: !!r.lockDescripcion,
          lockDebeHaber: !!r.lockDebeHaber,
          lockPrincipalDetalle: !!r.lockPrincipalDetalle,
          lockNivel: !!r.lockNivel,
          lockTipo: !!r.lockTipo,
          lockNaturaleza: !!r.lockNaturaleza,

          lockAdd:
            typeof r.lockAdd === "boolean"
              ? r.lockAdd
              : (r.lockRowActions ?? false),
          lockDelete:
            typeof r.lockDelete === "boolean"
              ? r.lockDelete
              : r.isPlantilla
              ? true
              : (r.lockRowActions ?? false),
        }));

        setRows(reindexRows(normalizadas));
      } catch (e) {
        console.error("Plantilla loader error:", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.orden - b.orden),
    [rows]
  );

  // ===== jerarquía por cuenta (padres) =====
  const parentByCuenta = useMemo(() => {
    const map = new Map<string, CuentaRow | undefined>();
    const all = sortedRows;

    for (const row of all) {
      const cuenta = String(row.cuenta ?? "");
      if (!cuenta) continue;

      if (Number(row.nivel) === 1) {
        map.set(cuenta, undefined);
        continue;
      }

      let parent: CuentaRow | undefined;
      let bestNivel = 0;

      for (const cand of all) {
        const cCuenta = String(cand.cuenta ?? "");
        if (!cCuenta) continue;
        if (
          Number(cand.nivel) < Number(row.nivel) &&
          cuenta.startsWith(cCuenta) &&
          Number(cand.nivel) > bestNivel
        ) {
          bestNivel = Number(cand.nivel);
          parent = cand;
        }
      }

      map.set(cuenta, parent);
    }

    return map;
  }, [sortedRows]);

  const getRootRow = useCallback(
    (row: CuentaRow): CuentaRow | undefined => {
      const cuenta = String(row.cuenta ?? "");
      if (!cuenta) return undefined;

      let current: CuentaRow | undefined = row;
      let parent = parentByCuenta.get(cuenta);

      while (parent) {
        current = parent;
        parent = parentByCuenta.get(String(parent.cuenta ?? ""));
      }
      return current;
    },
    [parentByCuenta]
  );

  // ===== selects =====
  const naturalezaOptions = useMemo<Naturaleza[]>(
    () => [
      "ACTIVO",
      "PASIVO",
      "CAPITAL",
      "INGRESOS",
      "COSTOS",
      "GASTOS",
      "OTROS INGRESOS",
      "OTROS GASTOS",
      "REVISAR",
    ],
    []
  );
  const tipoOptions = useMemo<Tipo[]>(
    () => ["BALANCE_GENERAL", "ESTADO_RESULTADOS", "CAPITAL"],
    []
  );

  // ======== REGLAS ACCIONES: Botón "+" y "🗑" ========
  const canAdd = (r: CuentaRow) => {
    // Solo nivel 4 y sin lockAdd
    if (Number(r.nivel) !== 4) return false;
    if (typeof (r as any).lockAdd === "boolean") return !(r as any).lockAdd;
    return !r.isPlantilla;
  };

  const canDelete = (r: CuentaRow) => !(r as any).lockDelete && !r.isPlantilla;

  const addAfter = (r: CuentaRow) => {
    if (!canAdd(r)) return;

    const nextCuenta = incrementCuenta(r.cuenta);
    const parentLeading = leadingDigit(r.cuenta);

    setRows((prev) => {
      const idx = prev.findIndex((x) => x.orden === r.orden);

      const nueva: CuentaRow & { _leadingRoot?: string } = {
        orden: 999999,
        cuenta: nextCuenta ?? "",
        descripcion: "",
        debeHaber: r.debeHaber,
        principalDetalle: "D",
        nivel: 4, // siempre nivel 4
        tipo: r.tipo ?? "BALANCE_GENERAL",
        naturaleza: r.naturaleza ?? "REVISAR",
        isPlantilla: false,

        lockCuenta: false,
        lockDescripcion: false,
        lockDebeHaber: false,
        lockPrincipalDetalle: false,
        lockNivel: true,
        lockTipo: false,
        lockNaturaleza: false,
        lockAdd: false,
        lockDelete: false,

        _leadingRoot: parentLeading,
      };

      const cp = [...prev];
      cp.splice(idx + 1, 0, nueva);
      return reindexRows(cp);
    });
  };

  const removeRow = (r: CuentaRow) => {
    if (!canDelete(r)) return;
    setRows((prev) => reindexRows(prev.filter((x) => x.orden !== r.orden)));
  };

  // ===== EXPANSIÓN (visibilidad) =====
  const toggleRoot = (root: RootId) => {
    setExpandedRoots((prev) => ({ ...prev, [root]: !prev[root] }));
  };

  const toggleNivel2 = (cuenta: string) => {
    setExpandedNivel2((prev) => {
      const next = new Set(prev);
      if (next.has(cuenta)) next.delete(cuenta);
      else next.add(cuenta);
      return next;
    });
  };

  const toggleNivel3 = (cuenta: string) => {
    setExpandedNivel3((prev) => {
      const next = new Set(prev);
      if (next.has(cuenta)) next.delete(cuenta);
      else next.add(cuenta);
      return next;
    });
  };

  const isVisibleRow = useCallback(
    (row: CuentaRow): boolean => {
      const nivel = Number(row.nivel);
      const cuenta = String(row.cuenta ?? "");

      if (!cuenta) return true;
      if (nivel === 1) return true;

      let parent = parentByCuenta.get(cuenta);
      while (parent) {
        const pCuenta = String(parent.cuenta ?? "");
        const pNivel = Number(parent.nivel);

        if (pNivel === 1) {
          const rootId = pCuenta as RootId;
          if (ROOT_IDS.includes(rootId) && !expandedRoots[rootId]) return false;
        } else if (pNivel === 2) {
          if (!expandedNivel2.has(pCuenta)) return false;
        } else if (pNivel === 3) {
          if (!expandedNivel3.has(pCuenta)) return false;
        }

        parent = parentByCuenta.get(pCuenta);
      }

      return true;
    },
    [parentByCuenta, expandedRoots, expandedNivel2, expandedNivel3]
  );

  const visibleRows = useMemo(
    () => sortedRows.filter(isVisibleRow),
    [sortedRows, isVisibleRow]
  );

  // ====== colores por grupo 1..6 y nivel (fondo de fila) ======
  const getRowBg = (row: CuentaRow) => {
    const rootRow = getRootRow(row);
    if (!rootRow) return "";

    const rootCuenta = String(rootRow.cuenta ?? "") as RootId;
    const nivel = Number(row.nivel);

    switch (rootCuenta) {
      case "1":
        return nivel === 1 ? "bg-stone-50" : "bg-stone-50";
      case "2":
        return nivel === 1 ? "bg-stone-50" : "bg-stone-50";
      case "3":
        return nivel === 1 ? "bg-stone-50" : "bg-stone-50";
      case "4":
        return nivel === 1 ? "bg-stone-50" : "bg-stone-50";
      case "5":
        return nivel === 1 ? "bg-stone-50" : "bg-stone-50";
      case "6":
        return nivel === 1 ? "bg-stone-50" : "bg-stone-50";
      default:
        return "";
    }
  };

  // ====== Paginación sobre filas VISIBLES ======
  const total = visibleRows.length;
  const last = Math.max(0, Math.ceil(total / pageSize) - 1);
  const start = page * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = visibleRows.slice(start, end);

  const nextPage = () => setPage((p) => Math.min(p + 1, last));
  const prevPage = () => setPage((p) => Math.max(p - 1, 0));
  useEffect(() => {
    if (page > last) setPage(last);
  }, [visibleRows, pageSize, last, page]);

  // ====== Guardar (con verificación de duplicados) ======
  const guardar = async () => {
    const dups = cuentasDuplicadas(rows);
    if (dups.length > 0) {
      alert(
        `Existen cuentas con la misma numeración:\n\n${dups.join(
          ", "
        )}\n\nCorrige los duplicados antes de guardar.`
      );
      return;
    }

    if (!nombre.trim()) {
      alert("Ingresa un nombre para la nomenclatura.");
      return;
    }

    const cuentasPayload = mapRowsForApi(rows);

    try {
      const res = await fetch(`/api/nomenclaturas?tenant=${usuario}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nombre,
          descripcion,
          versionGNIO: "GNIO 1.0",
          cuentas: cuentasPayload,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || data?.ok === false) {
        console.error("Error al guardar nomenclatura", data);
        alert(
          data?.error === "BAD_PAYLOAD"
            ? "El servidor rechazó los datos de la nomenclatura (BAD_PAYLOAD). Revisa que todas las cuentas tengan número, descripción, nivel y tipo válidos."
            : data?.error || "No se pudo guardar la nomenclatura."
        );
        return;
      }

      alert(`Guardado (filas: ${data?.totalFilas ?? cuentasPayload.length})`);
      router.push(`/dashboard/contador/${usuario}/nomenclatura`);
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar");
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar role="CONTADOR" usuario={String(usuario)} />

      <main className="flex-1 bg-stone-100">
        <div className="max-w-8xl mx-5 p-6">
          <h1 className="text-3xl font-bold">NOMENCLATURA DETALLES</h1>

          {/* Cabecera */}
          <section className="mt-6 bg-white rounded-xl shadow p-4">
            <h2 className="text-slate-800 font-semibold">
              Información General:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-xs text-slate-500">Nombre</label>
                <input
                  className="w-full mt-1 border rounded-lg px-3 py-2"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Descripción</label>
                <input
                  className="w-full mt-1 border rounded-lg px-3 py-2"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Tabla */}
          <section className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-slate-700 font-semibold">Cuentas:</h2>

              <div className="flex items-center gap-4">
                <div className="text-sm">
                  Rows per page:{" "}
                  <select
                    className="border rounded px-2 py-1"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                  >
                    {[10, 15, 20, 25, 30].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-sm">
                  {total === 0 ? "0-0 of 0" : `${start + 1}-${end} of ${total}`}
                </div>
                <div className="flex gap-2">
                  <button
                    className="border rounded px-2"
                    onClick={() => setPage(0)}
                    disabled={page === 0}
                  >
                    ⏮
                  </button>
                  <button
                    className="border rounded px-2"
                    onClick={prevPage}
                    disabled={page === 0}
                  >
                    ◀
                  </button>
                  <button
                    className="border rounded px-2"
                    onClick={nextPage}
                    disabled={page === last || total === 0}
                  >
                    ▶
                  </button>
                  <button
                    className="border rounded px-2"
                    onClick={() => setPage(last)}
                    disabled={page === last || total === 0}
                  >
                    ⏭
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-slate-500">Cargando plantilla…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-3 py-2 text-center">ACCIONES</th>
                      <th className="px-3 py-2 text-left">
                        PRINCIPAL/DETALLE
                      </th>
                      <th className="px-3 py-2 text-center">NIVEL</th>
                      <th className="px-3 py-2 text-left">CUENTA</th>
                      <th className="px-3 py-2 text-left">DESCRIPCIÓN</th>
                      <th className="px-3 py-2 text-left">DEBE/HABER</th>
                      <th className="px-3 py-2 text-left">TIPO</th>
                      <th className="px-3 py-2 text-left">NATURALEZA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => {
                      const ld = leadingDigit(r.cuenta) as RootId | undefined;
                      const isRoot = isRootRow(r) && !!ld;
                      const rootId = isRoot ? (ld as RootId) : undefined;

                      const nivel = Number(r.nivel);
                      const isNivel2 = nivel === 2;
                      const isNivel3 = nivel === 3;
                      const isExpandedNivel2 =
                        isNivel2 && expandedNivel2.has(String(r.cuenta ?? ""));
                      const isExpandedNivel3 =
                        isNivel3 && expandedNivel3.has(String(r.cuenta ?? ""));

                      const indentClass =
                        nivel === 1
                          ? ""
                          : nivel === 2
                          ? "pl-4"
                          : nivel === 3
                          ? "pl-8"
                          : "pl-12";

                      // Validación jerárquica al editar cuenta
                      const handleCuentaChange = (val: string) => {
                        const allowedLeading = (r as any)._leadingRoot as
                          | string
                          | undefined;
                        if (
                          allowedLeading &&
                          val &&
                          /^\d/.test(val) &&
                          val[0] !== allowedLeading
                        ) {
                          alert(
                            `Esa cuenta no pertenece a esta jerarquía. Debe iniciar con "${allowedLeading}".`
                          );
                          return;
                        }
                        setRows((prev) =>
                          prev.map((x) =>
                            x.orden === r.orden ? { ...x, cuenta: val } : x
                          )
                        );
                      };

                      // Color del botón NIVEL según jerarquía (igual que Desplegar)
                      const rootRowForNivel = getRootRow(r);
                      let nivelColorClass = "bg-slate-800";
                      if (rootRowForNivel) {
                        const c = String(
                          rootRowForNivel.cuenta ?? ""
                        ) as RootId;
                        if (ROOT_IDS.includes(c)) {
                          nivelColorClass = rootColors[c];
                        }
                      }

                      return (
                        <tr
                          key={r.orden}
                          className={cx("border-b", getRowBg(r))}
                        >
                          {/* ACCIONES */}
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className={cx(
                                  "px-2 py-1 rounded text-white text-xs",
                                  !canAdd(r)
                                    ? "bg-slate-300 cursor-not-allowed"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                                )}
                                disabled={!canAdd(r)}
                                onClick={() => addAfter(r)}
                                title="Crear nueva cuenta nivel 4"
                              >
                                +
                              </button>
                              <button
                                className={cx(
                                  "px-2 py-1 rounded text-white text-xs",
                                  !canDelete(r)
                                    ? "bg-slate-300 cursor-not-allowed"
                                    : "bg-rose-600 hover:bg-rose-700"
                                )}
                                disabled={!canDelete(r)}
                                onClick={() => removeRow(r)}
                                title="Eliminar cuenta creada por el usuario"
                              >
                                🗑
                              </button>
                            </div>
                          </td>

                          {/* PRINCIPAL / DETALLE */}
                          <td className="px-3 py-2">
                            {isRoot && rootId ? (
                              <button
                                className={cx(
                                  "inline-flex items-center gap-2 text-white px-3 py-1 rounded-full shadow-sm text-xs font-semibold",
                                  rootColors[rootId]
                                )}
                                onClick={() => toggleRoot(rootId)}
                                title={`${
                                  expandedRoots[rootId]
                                    ? "Ocultar"
                                    : "Desplegar"
                                } ${rootLabel[rootId]}`}
                              >
                                <span>
                                  {expandedRoots[rootId] ? "▼" : "►"}
                                </span>
                                <span>
                                  {expandedRoots[rootId]
                                    ? "Ocultar"
                                    : "Desplegar"}
                                </span>
                              </button>
                            ) : (
                              <select
                                className="border rounded px-2 py-1 text-xs"
                                value={r.principalDetalle}
                                disabled={r.lockPrincipalDetalle}
                                onChange={(e) =>
                                  setRows((prev) =>
                                    prev.map((x) =>
                                      x.orden === r.orden
                                        ? {
                                            ...x,
                                            principalDetalle:
                                              e.target.value as "P" | "D",
                                          }
                                        : x
                                    )
                                  )
                                }
                              >
                                <option value="P">P</option>
                                <option value="D">D</option>
                              </select>
                            )}
                          </td>

                          {/* NIVEL (botón por jerarquía) */}
                          <td className="px-3 py-2 text-center">
                            {isNivel2 || isNivel3 ? (
                              <button
                                type="button"
                                className={cx(
                                  "inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border",
                                  nivelColorClass,
                                  "text-white border-transparent",
                                  (isNivel2 && isExpandedNivel2) ||
                                    (isNivel3 && isExpandedNivel3)
                                    ? "opacity-100"
                                    : "opacity-80"
                                )}
                                onClick={() => {
                                  if (isNivel2) {
                                    toggleNivel2(String(r.cuenta ?? ""));
                                  } else if (isNivel3) {
                                    toggleNivel3(String(r.cuenta ?? ""));
                                  }
                                }}
                                title={
                                  (isNivel2 && isExpandedNivel2) ||
                                  (isNivel3 && isExpandedNivel3)
                                    ? "Ocultar subcuentas"
                                    : "Desplegar subcuentas"
                                }
                              >
                                <span>{r.nivel}</span>
                                <span>
                                  {(isNivel2 && isExpandedNivel2) ||
                                  (isNivel3 && isExpandedNivel3)
                                    ? "▼"
                                    : "▶"}
                                </span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-1 rounded-full text-xs text-slate-700 bg-white">
                                {r.nivel}
                              </span>
                            )}
                          </td>

                          {/* CUENTA */}
                          <td className="px-3 py-2">
                            <input
                              className={cx(
                                "w-32 border rounded px-2 py-1 text-sm",
                                (r.lockCuenta || r.principalDetalle === "P") &&
                                  "bg-gray-200"
                              )}
                              value={r.cuenta}
                              disabled={
                                r.lockCuenta || r.principalDetalle === "P"
                              }
                              onChange={(e) =>
                                handleCuentaChange(e.target.value)
                              }
                            />
                          </td>

                          {/* DESCRIPCIÓN */}
                          <td className={cx("px-3 py-2", indentClass)}>
                            <input
                              className={cx(
                                "w-64 border rounded px-2 py-1 text-sm",
                                (r.lockDescripcion ||
                                  r.principalDetalle === "P") &&
                                  "bg-gray-200"
                              )}
                              value={r.descripcion}
                              placeholder="Añade la descripción…"
                              disabled={
                                r.lockDescripcion || r.principalDetalle === "P"
                              }
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) =>
                                    x.orden === r.orden
                                      ? { ...x, descripcion: e.target.value }
                                      : x
                                  )
                                )
                              }
                            />
                          </td>

                          {/* DEBE / HABER */}
                          <td className="px-3 py-2">
                            <select
                              className={cx(
                                "border rounded px-2 py-1 text-xs",
                                (r.lockDebeHaber ||
                                  r.principalDetalle === "P") &&
                                  "bg-gray-200"
                              )}
                              value={r.debeHaber}
                              disabled={
                                r.lockDebeHaber || r.principalDetalle === "P"
                              }
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) =>
                                    x.orden === r.orden
                                      ? {
                                          ...x,
                                          debeHaber: e.target
                                            .value as "DEBE" | "HABER",
                                        }
                                      : x
                                  )
                                )
                              }
                            >
                              <option value="DEBE">DEBE</option>
                              <option value="HABER">HABER</option>
                            </select>
                          </td>

                          {/* TIPO */}
                          <td className="px-3 py-2">
                            <select
                              className={cx(
                                "border rounded px-2 py-1 text-xs",
                                (r.lockTipo ||
                                  r.principalDetalle === "P") &&
                                  "bg-gray-200"
                              )}
                              value={r.tipo}
                              disabled={
                                r.lockTipo || r.principalDetalle === "P"
                              }
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) =>
                                    x.orden === r.orden
                                      ? { ...x, tipo: e.target.value as Tipo }
                                      : x
                                  )
                                )
                              }
                            >
                              {tipoOptions.map((t) => (
                                <option key={t} value={t}>
                                  {t.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* NATURALEZA */}
                          <td className="px-3 py-2">
                            <select
                              className={cx(
                                "border rounded px-2 py-1 text-xs",
                                (r.lockNaturaleza ||
                                  r.principalDetalle === "P") &&
                                  "bg-gray-200"
                              )}
                              value={r.naturaleza}
                              disabled={
                                r.lockNaturaleza ||
                                r.principalDetalle === "P"
                              }
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) =>
                                    x.orden === r.orden
                                      ? {
                                          ...x,
                                          naturaleza:
                                            e.target.value as Naturaleza,
                                        }
                                      : x
                                  )
                                )
                              }
                            >
                              {naturalezaOptions.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 flex justify-end">
              <button
                onClick={guardar}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Guardar
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
