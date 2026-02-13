// src/components/organisms/forms/AsientoContableForm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ZodError, type ZodIssue } from "zod";

import {
  Button,
  CalendarForm,
  Input,
  Select,
  Text,
  TextArea,
  SelectTable,
  ActionButton,
  PlusIcon,
  TrashIcon,
  TableInput,
} from "@/components/atoms";
import {  Table} from "@/components/molecules"
import type { TableColumn } from "react-data-table-component";

import type { SelectOption, OptionType, IAsientoContableForm, IPartidaForm } from "@/utils";
import { asientoContableSchema, partidaSchema } from "@/utils";

import { obtenerPolizas, crearAsientoContable } from "@/utils/services/partidas";
import { obtenerCuentasByEmpresa } from "@/utils/services/nomenclatura";

type Props = {
  empresaId: number;
  tenant?: string; // opcional; si no viene, lo resolvemos desde URL
};

type CuentaFull = {
  id: number | string;
  cuenta: number | string;
  descripcion?: string | null;
  nivel?: number | null;
};

function resolveTenantFallback(explicitTenant?: string) {
  if (explicitTenant && explicitTenant.trim()) return explicitTenant.trim();

  if (typeof window === "undefined") return "";
  const qs = new URLSearchParams(window.location.search);
  const qTenant = qs.get("tenant");
  if (qTenant && qTenant.trim()) return qTenant.trim();

  // fallback: /dashboard/contador/[usuario]/...
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("contador");
  if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1]);

  return "";
}

export const AsientoContableForm = ({ empresaId, tenant: tenantProp }: Props) => {
  const router = useRouter();

  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  const [tenant, setTenant] = useState<string>("");

  const [polizas, setPolizas] = useState<SelectOption[]>([]);
  const [polizaSelected, setPolizaSelected] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });

  const [cuentasFull, setCuentasFull] = useState<CuentaFull[]>([]);
  const cuentasOptions = useMemo(() => {
    // Convertimos FULL → SelectOption (value = ID numérico como string)
    return (cuentasFull || [])
      .map((c) => {
        const idNum = Number(c.id);
        if (!idNum || Number.isNaN(idNum)) return null;

        const cuentaTxt = c.cuenta != null ? String(c.cuenta) : "";
        const descTxt = c.descripcion ? String(c.descripcion) : "";
        const label = descTxt ? `${cuentaTxt} - ${descTxt}` : cuentaTxt;

        return {
          value: String(idNum),
          label,
          nivel: Number(c.nivel ?? 0),
        } as any;
      })
      .filter(Boolean) as any[];
  }, [cuentasFull]);

  const [cuentaSelected, setCuentaSelected] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });

  const [formData, setFormData] = useState<IAsientoContableForm>({
    empresa_id: empresaId,
    poliza_id: 0,
    descripcion: "",
    fecha_trabajo: new Date(),
    partidas: [],
  });

  const [partida, setPartida] = useState<{ monto_debe: string; monto_haber: string }>({
    monto_debe: "0",
    monto_haber: "0",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [partidaErrors, setPartidaErrors] = useState<Record<string, string>>({});

  // 0) asegurar empresaId en formData si cambia
  useEffect(() => {
    setFormData((prev) => ({ ...prev, empresa_id: empresaId }));
  }, [empresaId]);

  // 1) resolver tenant
  useEffect(() => {
    const t = resolveTenantFallback(tenantProp);
    setTenant(t);

    if (!t) {
      toast.error("TENANT_REQUIRED: falta ?tenant=... en la URL o no se pudo resolver desde la ruta.");
    }
  }, [tenantProp]);

  // 2) cargar pólizas (requiere tenant)
  useEffect(() => {
    const run = async () => {
      if (!tenant) return;

      setFetching(true);
      try {
        const { status, message, data } = await obtenerPolizas(
          tenant,
          true,
          empresaId
        );

        if (status === 200) {
          setPolizas((data ?? []) as SelectOption[]);
        } else {
          toast.error(message || "Error al obtener pólizas");
        }
      } catch (e) {
        console.error(e);
        toast.error("Error al obtener pólizas");
      } finally {
        setFetching(false);
      }
    };
    run();
  }, [tenant]);

  // 3) cargar cuentas FULL de la nomenclatura de la empresa (empresaId + tenant opcional)
  useEffect(() => {
    const run = async () => {
      if (!empresaId || Number.isNaN(empresaId)) return;

      setFetching(true);
      try {
        const { status, message, data } = await obtenerCuentasByEmpresa(empresaId, false, tenant || undefined);

        if (status === 200) {
          setCuentasFull((data ?? []) as CuentaFull[]);
        } else {
          toast.error(message || "Error al obtener cuentas");
        }
      } catch (e) {
        console.error(e);
        toast.error("Error al obtener cuentas");
      } finally {
        setFetching(false);
      }
    };
    run();
  }, [empresaId, tenant]);

  // 4) Auto-llenado 1:1 por póliza (mantengo tu lógica, pero sin duplicar partidas)
  useEffect(() => {
    const fill = () => {
      if (!polizaSelected.value) return;
      if (!cuentasFull.length) return;

      const poliza = Number(polizaSelected.value);
      let cuentasPoliza: number[] = [];

      switch (poliza) {
        case 5:
          cuentasPoliza = [520101, 520102, 520107, 210206, 210305, 110101];
          break;
        default:
          cuentasPoliza = [];
          break;
      }

      if (!cuentasPoliza.length) return;

      const nuevas: IPartidaForm[] = [];

      for (const codigo of cuentasPoliza) {
        const match = (cuentasFull as CuentaFull[]).find((c) => Number(c.cuenta) === Number(codigo));
        if (!match) continue;

        const idNum = Number(match.id);
        if (!idNum || Number.isNaN(idNum)) continue;

        const exists = formData.partidas.some((p) => Number(p.cuenta_id) === idNum);
        if (exists) continue;

        nuevas.push({ cuenta_id: idNum, monto_debe: 0, monto_haber: 0 });
      }

      if (nuevas.length) {
        setFormData((prev) => ({ ...prev, partidas: [...prev.partidas, ...nuevas] }));
      }
    };

    fill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polizaSelected, cuentasFull]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePartidaChange = (e: React.ChangeEvent<any>) => {
    setPartida({ ...partida, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date: Date[], name: string) => {
    setFormData({ ...formData, [name]: date[0] });
  };

  const parseFormData = (data: IAsientoContableForm): IAsientoContableForm => {
    return {
      ...data,
      empresa_id: Number(empresaId),
      poliza_id: Number(polizaSelected.value || 0),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!tenant) return toast.error("TENANT_REQUIRED");
      if (!empresaId || Number.isNaN(empresaId)) return toast.error("EMPRESA_CONTEXT_REQUIRED");

      const data = parseFormData(formData);

      asientoContableSchema.parse(data);

      setErrors({});
      setLoading(true);

      const sumaDebe = data.partidas.reduce((t, p) => t + Number(p.monto_debe || 0), 0);
      const sumaHaber = data.partidas.reduce((t, p) => t + Number(p.monto_haber || 0), 0);

      if (Number(sumaDebe.toFixed(2)) !== Number(sumaHaber.toFixed(2))) {
        return toast.error('Los montos en "Debe" y "Haber" no cuadran. Deben ser iguales.');
      }

      if (sumaDebe === 0 || sumaHaber === 0) {
        return toast.error('Los montos en "Debe" y "Haber" son inválidos. Deben ser mayores a 0.');
      }

      const { status, message } = await crearAsientoContable(tenant, empresaId, data);

      if (status === 200) {
        toast.success("Asiento Contable creado correctamente");
        router.push(`/dashboard/contador/${encodeURIComponent("contador")}/empresas/${empresaId}/asientos_contables`);
      } else {
        toast.error(message || "Error al guardar");
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        (error.issues as ZodIssue[]).forEach((issue) => {
          const field = issue.path?.[0];
          if (typeof field === "string") newErrors[field] = issue.message;
        });

        if (newErrors.poliza_id) {
          setPolizaSelected((p) => ({ ...p, error: newErrors.poliza_id }));
        } else {
          setPolizaSelected((p) => ({ ...p, error: "" }));
        }

        setErrors(newErrors);
      } else {
        console.error(error);
        toast.error("Ocurrió un error");
      }
    } finally {
      setLoading(false);
    }
  };

  const parserPartidaData = (): IPartidaForm => {
    return {
      cuenta_id: Number(cuentaSelected.value || 0),
      monto_debe: parseFloat(partida.monto_debe ?? "0"),
      monto_haber: parseFloat(partida.monto_haber ?? "0"),
    };
  };

  const handleAddPartida = () => {
    try {
      const data = parserPartidaData();
      partidaSchema.parse(data);

      const exists = formData.partidas.some((p) => Number(p.cuenta_id) === Number(data.cuenta_id));
      if (exists) return toast.error("Esta partida ya existe en el listado.");

      if (data.monto_debe === 0 && data.monto_haber === 0) {
        return toast.error('Debe ingresar un monto mayor a 0 en "Debe" o "Haber".');
      }

      setPartidaErrors({});
      setFormData((prev) => ({ ...prev, partidas: [...prev.partidas, data] }));

      setPartida({ monto_debe: "0", monto_haber: "0" });
      setCuentaSelected({ value: "", label: "Selecciona", error: "" });
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        (error.issues as ZodIssue[]).forEach((issue) => {
          const field = issue.path?.[0];
          if (typeof field === "string") newErrors[field] = issue.message;
        });

        if (newErrors.cuenta_id) {
          setCuentaSelected((c) => ({ ...c, error: newErrors.cuenta_id }));
        } else {
          setCuentaSelected((c) => ({ ...c, error: "" }));
        }

        setPartidaErrors(newErrors);
      }
    }
  };

  const handleDeletePartida = (_row: IPartidaForm, index: number) => {
    setFormData((prev) => ({
      ...prev,
      partidas: prev.partidas.filter((_, i) => i !== index),
    }));
  };

  const handleSelectPartidaChange = (propertyName: string, newValue: OptionType | null, row: IPartidaForm) => {
    if (!newValue) return;

    const updated = formData.partidas.map((p) => {
      if (p === row) {
        return { ...p, [propertyName]: Number(newValue.value) };
      }
      return p;
    });

    setFormData((prev) => ({ ...prev, partidas: updated }));
  };

  const handleInputPartidaChange = (col: string, newValue: React.ChangeEvent<any>, row: IPartidaForm) => {
    const updated = formData.partidas.map((p) => {
      if (p === row) {
        return { ...p, [col]: parseFloat(newValue.target.value ?? "0") };
      }
      return p;
    });

    setFormData((prev) => ({ ...prev, partidas: updated }));
  };

  const columns: TableColumn<IPartidaForm>[] = [
    {
      name: "Cuenta",
      minWidth: "250px",
      grow: 2,
      cell: (row) => (
        <SelectTable
          values={cuentasOptions}
          value={String(row.cuenta_id)}
          onChange={(newValue) => handleSelectPartidaChange("cuenta_id", newValue, row)}
          loading={fetching}
          isOptionDisabled={(option: any) => Number(option.nivel ?? 0) <= 3}
          top
        />
      ),
    },
    {
      name: "Monto Debe",
      minWidth: "250px",
      cell: (row) => (
        <TableInput
          type="number"
          onChange={(newValue) => handleInputPartidaChange("monto_debe", newValue, row)}
          value={String(row.monto_debe ?? 0)}
          disabled={false}
        />
      ),
    },
    {
      name: "Monto Haber",
      minWidth: "250px",
      cell: (row) => (
        <TableInput
          type="number"
          onChange={(newValue) => handleInputPartidaChange("monto_haber", newValue, row)}
          value={String(row.monto_haber ?? 0)}
          disabled={false}
        />
      ),
    },
    {
      name: "",
      maxWidth: "100px",
      cell: (row, index) => (
        <ActionButton
          icon={<TrashIcon />}
          text="Eliminar"
          variant="delete"
          onClick={() => handleDeletePartida(row, index)}
        />
      ),
    },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white p-6 rounded-lg">
        <Text variant={"subtitle"}>Información General: </Text>
        <hr className="border-gray-400" />

        <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
          <Select
            values={polizas}
            selected={polizaSelected}
            setSelected={setPolizaSelected}
            label="Selecciona la Poliza*: "
            loading={fetching}
          />

          <CalendarForm
            label="Fecha*: "
            placeholder="Elige la fecha"
            name="fecha_trabajo"
            value={formData.fecha_trabajo}
            onChange={(date) => handleDateChange(date, "fecha_trabajo")}
            errorMessage={errors.fecha_trabajo}
          />

          <div className="col-span-1 md:col-span-2">
            <TextArea
              label="Descripción (opcional)"
              placeholder="Ingresa la descripción del asiento contable"
              name="descripcion"
              value={formData.descripcion ?? ""}
              onChange={handleChange}
              errorMessage={errors.descripcion}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg mt-5">
        <Text variant={"subtitle"}>Partidas: </Text>
        <hr className="border-gray-400 mb-5" />

        {cuentasOptions.length > 0 ? (
          <div className="min-h-24">
            <div className="flex w-full flex-col md:flex-row md:justify-between md:items-center mb-5 md:min-h-28">
              <Select
                values={cuentasOptions}
                selected={cuentaSelected}
                setSelected={setCuentaSelected}
                label="Selecciona una Cuenta*: "
                loading={fetching}
                className="w-full md:w-2/5"
                top
                errorMessage={partidaErrors.cuenta_id}
                isOptionDisabled={(option: any) => Number(option.nivel ?? 0) <= 3}
              />

              <Input
                label="Monto Debe*"
                placeholder="Ingresa la cantidad"
                name="monto_debe"
                value={partida.monto_debe}
                onChange={handlePartidaChange}
                errorMessage={partidaErrors.monto_debe}
                type="number"
                classNameContainer="w-full md:w-1/4"
              />

              <Input
                label="Monto Haber*"
                placeholder="Ingresa la cantidad"
                name="monto_haber"
                value={partida.monto_haber}
                onChange={handlePartidaChange}
                errorMessage={partidaErrors.monto_haber}
                type="number"
                classNameContainer="w-full md:w-1/4"
              />

              <ActionButton
                icon={<PlusIcon />}
                text="Agregar"
                onClick={handleAddPartida}
                variant="save"
                className="md:my-auto"
              />
            </div>

            <Table
              columns={columns}
              rows={formData.partidas}
              pending={false}
              noDataText="Agrega Partidas"
              className={clsx("border rounded-lg")}
            />
          </div>
        ) : (
          <div className="flex justify-center items-center w-full min-h-24 border rounded-lg">
            <Text variant="paragraph" italic>
              {tenant
                ? "No hay cuentas disponibles para la empresa activa (o no tiene nomenclatura afiliada)."
                : "Falta tenant (usa ?tenant=tu-tenant)."}
            </Text>
          </div>
        )}

        <div
          className={clsx(
            "transition-opacity duration-300 ease-in-out mt-2",
            errors?.partidas ? "opacity-100 h-6" : "opacity-0 h-0"
          )}
        >
          <span className={clsx("text-sm text-red-500", "block")}>{errors?.partidas}</span>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <Button type="submit" loading={loading}>
          Guardar Asiento Contable
        </Button>
      </div>
    </form>
  );
};
