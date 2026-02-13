"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { Path } from "@/components/molecules/Path";
import { Button } from "@/components/atoms";
import { obtenerCuentasBancariasByEmpresaId } from "@/utils/services/cuentasBancarias";

type PendienteRow = {
  documento_uuid: string;
  serie: string;
  numero_dte: string;
  fecha_emision: string;
  tercero: string;
  total: number;
  aplicado: number;
  pendiente: number;
  aplicar?: number;
};

export default function TesoreriaPage() {
  const params = useParams();
  const search = useSearchParams();
  const usuario = String(params?.usuario ?? "");
  const empresaId = Number(params?.id);
  const tenantSlug = search.get("tenant") || usuario;

  const [loading, setLoading] = useState(true);
  const [postingCobro, setPostingCobro] = useState(false);
  const [postingPago, setPostingPago] = useState(false);

  const [cxc, setCxc] = useState<PendienteRow[]>([]);
  const [cxp, setCxp] = useState<PendienteRow[]>([]);

  const [cuentasBancarias, setCuentasBancarias] = useState<
    { value: string; label: string }[]
  >([]);
  const [cuentaCobro, setCuentaCobro] = useState("");
  const [cuentaPago, setCuentaPago] = useState("");

  const [fechaCobro, setFechaCobro] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [montoCobro, setMontoCobro] = useState(0);
  const [montoPago, setMontoPago] = useState(0);
  const [refCobro, setRefCobro] = useState("");
  const [refPago, setRefPago] = useState("");

  const fetchPendientes = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/contabilidad/pendientes?empresa_id=${empresaId}&tenant=${encodeURIComponent(
          tenantSlug
        )}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "No se pudieron cargar pendientes.");
      }
      const data = json?.data ?? { cxc: [], cxp: [] };
      setCxc((data.cxc || []).map((row: any) => ({ ...row, aplicar: 0 })));
      setCxp((data.cxp || []).map((row: any) => ({ ...row, aplicar: 0 })));
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al cargar pendientes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBancos = async () => {
    try {
      const { status, data } = await obtenerCuentasBancariasByEmpresaId(
        empresaId,
        true,
        tenantSlug
      );
      if (status === 200 && Array.isArray(data)) {
        setCuentasBancarias(
          data.map((item: any) => ({
            value: String(item.value ?? item.id ?? ""),
            label: String(item.label ?? ""),
          }))
        );
      } else {
        setCuentasBancarias([]);
      }
    } catch (error) {
      console.error(error);
      setCuentasBancarias([]);
    }
  };

  useEffect(() => {
    if (!empresaId) return;
    fetchPendientes();
    fetchBancos();
  }, [empresaId, tenantSlug]);

  const totalAplicadoCobro = useMemo(
    () => cxc.reduce((acc, row) => acc + Number(row.aplicar || 0), 0),
    [cxc]
  );
  const totalAplicadoPago = useMemo(
    () => cxp.reduce((acc, row) => acc + Number(row.aplicar || 0), 0),
    [cxp]
  );

  const submitCobro = async () => {
    if (!cuentaCobro) {
      toast.error("Selecciona una cuenta bancaria para el cobro.");
      return;
    }
    if (montoCobro <= 0) {
      toast.error("Monto de cobro inválido.");
      return;
    }
    if (totalAplicadoCobro > montoCobro) {
      toast.error("La suma aplicada excede el monto del cobro.");
      return;
    }

    const aplicaciones = cxc
      .filter((row) => Number(row.aplicar || 0) > 0)
      .map((row) => ({
        documento_uuid: row.documento_uuid,
        monto_aplicado: Number(row.aplicar || 0),
      }));

    try {
      setPostingCobro(true);
      const res = await fetch("/api/tesoreria/cobros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: tenantSlug,
          empresa_id: empresaId,
          fecha: fechaCobro,
          monto: montoCobro,
          referencia: refCobro || null,
          cuenta_bancaria_id: Number(cuentaCobro),
          aplicaciones,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "No se pudo registrar el cobro.");
      }
      toast.success("Cobro registrado.");
      setMontoCobro(0);
      setRefCobro("");
      setCxc((prev) => prev.map((row) => ({ ...row, aplicar: 0 })));
      fetchPendientes();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al registrar cobro.");
    } finally {
      setPostingCobro(false);
    }
  };

  const submitPago = async () => {
    if (!cuentaPago) {
      toast.error("Selecciona una cuenta bancaria para el pago.");
      return;
    }
    if (montoPago <= 0) {
      toast.error("Monto de pago inválido.");
      return;
    }
    if (totalAplicadoPago > montoPago) {
      toast.error("La suma aplicada excede el monto del pago.");
      return;
    }

    const aplicaciones = cxp
      .filter((row) => Number(row.aplicar || 0) > 0)
      .map((row) => ({
        documento_uuid: row.documento_uuid,
        monto_aplicado: Number(row.aplicar || 0),
      }));

    try {
      setPostingPago(true);
      const res = await fetch("/api/tesoreria/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: tenantSlug,
          empresa_id: empresaId,
          fecha: fechaPago,
          monto: montoPago,
          referencia: refPago || null,
          cuenta_bancaria_id: Number(cuentaPago),
          aplicaciones,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "No se pudo registrar el pago.");
      }
      toast.success("Pago registrado.");
      setMontoPago(0);
      setRefPago("");
      setCxp((prev) => prev.map((row) => ({ ...row, aplicar: 0 })));
      fetchPendientes();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al registrar pago.");
    } finally {
      setPostingPago(false);
    }
  };

  const handleAplicar = (
    rows: PendienteRow[],
    setRows: (rows: PendienteRow[]) => void,
    uuid: string,
    value: number
  ) => {
    setRows(
      rows.map((row) =>
        row.documento_uuid === uuid
          ? { ...row, aplicar: Math.max(0, value) }
          : row
      )
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <EmpresaSidebar empresaId={empresaId} forceUsuario={usuario} />
      <main className="flex-1 p-6">
        <div className="containerPage max-w-6xl mx-auto space-y-6">
          <Path
            parent={{
              text: "Tesorería",
              href: `/dashboard/contador/${usuario}/empresas/${empresaId}/tesoreria?tenant=${encodeURIComponent(
                tenantSlug
              )}`,
            }}
            hijos={[{ text: "Pagos y Cobros" }]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-lg bg-white p-6 shadow space-y-4">
              <h2 className="text-lg font-semibold">Registrar Cobro</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">Fecha</label>
                  <input
                    type="date"
                    value={fechaCobro}
                    onChange={(e) => setFechaCobro(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Monto</label>
                  <input
                    type="number"
                    min={0}
                    value={montoCobro}
                    onChange={(e) => setMontoCobro(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-600">Cuenta bancaria</label>
                  <select
                    value={cuentaCobro}
                    onChange={(e) => setCuentaCobro(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  >
                    <option value="">Selecciona</option>
                    {cuentasBancarias.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-600">Referencia</label>
                  <input
                    type="text"
                    value={refCobro}
                    onChange={(e) => setRefCobro(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="rounded-md border border-slate-200 p-3 space-y-2">
                <p className="text-sm font-semibold">Aplicar a CxC</p>
                {loading && <p className="text-sm text-slate-500">Cargando...</p>}
                {!loading && cxc.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No hay documentos pendientes.
                  </p>
                )}
                {!loading &&
                  cxc.map((row) => (
                    <div
                      key={row.documento_uuid}
                      className="grid grid-cols-[1fr_120px] gap-2 items-center text-sm"
                    >
                      <div>
                        {row.serie}-{row.numero_dte} | {row.tercero} | Pendiente Q
                        {Number(row.pendiente || 0).toFixed(2)}
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={row.aplicar ?? 0}
                        onChange={(e) =>
                          handleAplicar(
                            cxc,
                            setCxc,
                            row.documento_uuid,
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1"
                      />
                    </div>
                  ))}
                <p className="text-sm text-slate-600">
                  Total aplicado: Q{totalAplicadoCobro.toFixed(2)}
                </p>
              </div>

              <Button onClick={submitCobro} loading={postingCobro}>
                Registrar cobro
              </Button>
            </section>

            <section className="rounded-lg bg-white p-6 shadow space-y-4">
              <h2 className="text-lg font-semibold">Registrar Pago</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">Fecha</label>
                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Monto</label>
                  <input
                    type="number"
                    min={0}
                    value={montoPago}
                    onChange={(e) => setMontoPago(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-600">Cuenta bancaria</label>
                  <select
                    value={cuentaPago}
                    onChange={(e) => setCuentaPago(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  >
                    <option value="">Selecciona</option>
                    {cuentasBancarias.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-600">Referencia</label>
                  <input
                    type="text"
                    value={refPago}
                    onChange={(e) => setRefPago(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="rounded-md border border-slate-200 p-3 space-y-2">
                <p className="text-sm font-semibold">Aplicar a CxP</p>
                {loading && <p className="text-sm text-slate-500">Cargando...</p>}
                {!loading && cxp.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No hay documentos pendientes.
                  </p>
                )}
                {!loading &&
                  cxp.map((row) => (
                    <div
                      key={row.documento_uuid}
                      className="grid grid-cols-[1fr_120px] gap-2 items-center text-sm"
                    >
                      <div>
                        {row.serie}-{row.numero_dte} | {row.tercero} | Pendiente Q
                        {Number(row.pendiente || 0).toFixed(2)}
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={row.aplicar ?? 0}
                        onChange={(e) =>
                          handleAplicar(
                            cxp,
                            setCxp,
                            row.documento_uuid,
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1"
                      />
                    </div>
                  ))}
                <p className="text-sm text-slate-600">
                  Total aplicado: Q{totalAplicadoPago.toFixed(2)}
                </p>
              </div>

              <Button onClick={submitPago} loading={postingPago} variant="error">
                Registrar pago
              </Button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
