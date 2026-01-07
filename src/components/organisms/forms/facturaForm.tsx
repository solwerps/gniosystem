// src/components/organisms/forms/facturaForm.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import {
  Button,
  CalendarForm,
  Input,
  Select,
  Text,
  CheckBox,
  CalendarMonth,
} from "@/components/atoms";

import { crearFactura } from "@/utils/services/documentos";
import { obtenerCuentasByEmpresa } from "@/utils/services/nomenclatura";
import type { OptionType } from "@/utils/models/variety";
import type { SelectOption } from "@/utils/models/nomenclaturas";
import { tiposDocumento } from "@/utils/data/documentosData";
import { ZodError } from "zod";

interface FacturaFormProps {
  empresaId: number;
  empresaNombre: string;
  empresaNit?: string; 
  usuario: string;
}

export const FacturaForm: React.FC<FacturaFormProps> = ({
  empresaId,
  empresaNombre,
  usuario,
}) => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [step, setStep] = useState(1);

  // Form
  const [formData, setFormData] = useState({
    fecha_emision: new Date(),
    fecha_anulacion: null as Date | null,
    importacion: false,
    numero_autorizacion: "",
    numero_dte: "",
    serie: "",
    nit_emisor: "",
    nombre_emisor: "",
    id_receptor: "",
    nombre_receptor: "",
    numero_de_establecimiento: "" as any,
    nombre_de_establecimiento: "",
    monto_total: 0,
    iva: 0,
    petroleo: 0,
    turismo_hospedaje: 0,
    turismo_pasajes: 0,
    timbre_prensa: 0,
    bomberos: 0,
    tasa_municipal: 0,
    bebidas_alcoholicas: 0,
    tabaco: 0,
    cemento: 0,
    bebidas_no_alcoholicas: 0,
    tarifa_portuaria: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cuentas
  const [cuentas, setCuentas] = useState<SelectOption[]>([]);
  const [cuentaDebe, setCuentaDebe] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });
  const [cuentaHaber, setCuentaHaber] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });

  // Selects
  const [operacion, setOperacion] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });
  const [dte, setDte] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });
  const [transaction, setTransaction] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });
  const [moneda, setMoneda] = useState<OptionType>(monedasOptions[0]);

  // Calendar Month → periodo contable (fecha_trabajo)
  const [date, setDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 🔹 GNIO: traer cuentas por empresaId (multi-tenant)
  useEffect(() => {
    const fetchCuentas = async () => {
      if (!empresaId) return;

      setIsFetching(true);
      try {
        const { status, data, message } = await obtenerCuentasByEmpresa(
          Number(empresaId),
          true
        );
        if (status === 200) {
          setCuentas(data);
        } else {
          throw new Error(message);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchCuentas();
  }, [empresaId]);

  // Cuando se selecciona tipo de operación y ya están las cuentas, sugerir DEBE/HABER
  useEffect(() => {
    if (operacion.value && operacion.value !== "" && cuentas.length > 0) {
      updateCuentas(cuentas, operacion.value);
    }
  }, [operacion.value, cuentas]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === "number" ? parseFloat(value) : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleDateChange = (dateArr: Date[], name: string) => {
    setFormData((prev) => ({ ...prev, [name]: dateArr[0] ?? null }));
  };

  /**
   * Sugerir cuentas por defecto según operación (venta/compra),
   * usando los códigos estándar de la nomenclatura tipo Conta Cox,
   * pero alineado a la lógica GNIO:
   *  - VENTA:    cuenta_debe = caja (110101), cuenta_haber = ventas (410101)
   *  - COMPRA:   cuenta_debe = gastos (520218), cuenta_haber = caja (110101)
   */
  const updateCuentas = (cuentasList: SelectOption[], tipo: string | number) => {
    const cuentaLabels: Record<string, string> = {
      ventas: "410101",
      gastos: "520218",
      caja: "110101",
    };

    const getCuenta = (label: string) =>
      cuentasList.find((cuenta) => cuenta.label.includes(label));

    const esVenta = tipo === "venta";

    const cuentaVentas = getCuenta(cuentaLabels.ventas);
    const cuentaGastos = getCuenta(cuentaLabels.gastos);
    const cuentaCaja = getCuenta(cuentaLabels.caja);

    const cuenta_debe = esVenta ? cuentaCaja : cuentaGastos;
    const cuenta_haber = esVenta ? cuentaVentas : cuentaCaja;

    setCuentaDebe(
      cuenta_debe ?? {
        value: "",
        label: "Selecciona",
        error: "No se pudo encontrar la cuenta sugerida",
      }
    );
    setCuentaHaber(
      cuenta_haber ?? {
        value: "",
        label: "Selecciona",
        error: "No se pudo encontrar la cuenta sugerida",
      }
    );
  };

  const handleValidate = () => {
    const fieldsToValidate = [
      {
        value: empresaId,
        message: "La empresa no es válida. Vuelva a ingresar.",
      },
      {
        value: operacion.value,
        message:
          "Debe seleccionar un tipo de operación (Compra o Venta).",
      },
    ];

    for (const field of fieldsToValidate) {
      if (!field.value) {
        toast.error(field.message);
        return;
      }
    }

    setStep(2);
  };

  /**
   * Arma el payload final que se manda a la API GNIO
   * para crear UNA factura manual.
   */

// En facturaForm.tsx
const parserData = (
  empresaId: number,
  operacion: OptionType,
  dte: OptionType,
  transaction: OptionType,
  moneda: OptionType,
  data: any,
  fecha_trabajo: Date
) => ({
  fecha_trabajo,
  empresa_id: empresaId,           // 👈 AQUÍ se setea
  tipo_dte: dte.value,
  moneda: moneda.value,
  tipo_operacion: operacion.value,
  tipo: transaction.value,
  cuenta_debe: cuentaDebe.value,
  cuenta_haber: cuentaHaber.value,
  ...data,
  nit_emisor: data.nit_emisor || "0",
  id_receptor: data.id_receptor || "0",
});





  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
const data = parserData(
  empresaId,           // 👈 viene desde props de la página
  operacion,
  dte,
  transaction,
  moneda,
  formData,
  date
);

      setErrors({});
      setLoading(true);

      const { status, message } = await crearFactura(data);

      setLoading(false);

      if (status === 200) {
        toast.success("Documento creado correctamente");
        router.push(
          `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos`
        );
      } else {
        toast.error(message || "Ocurrió un error al guardar el documento.");
      }
    } catch (error: any) {
      if (error instanceof ZodError) {
        toast.error("Datos erróneos. Revise la información nuevamente.");
        const newErrors: Record<string, string> = {};

        // 🔧 Tu Zod tiene .issues, no .errors
        error.issues.forEach((issue) => {
          const fieldName = issue.path[0];
          if (typeof fieldName === "string") {
            newErrors[fieldName] = issue.message;
          }
        });

        const updateSelectError = (
          field: string,
          setSelectState: React.Dispatch<React.SetStateAction<OptionType>>
        ) => {
          setSelectState((prev) => ({
            ...prev,
            error: newErrors[field] ?? "",
          }));
        };

        updateSelectError("tipo_dte", setDte);
        updateSelectError("tipo_operacion", setOperacion);
        updateSelectError("tipo", setTransaction);
        updateSelectError("moneda", setMoneda);
        updateSelectError("cuenta_debe", setCuentaDebe);
        updateSelectError("cuenta_haber", setCuentaHaber);

        setErrors(newErrors);
        console.log(newErrors);
      } else {
        toast.error(
          error?.message || "Ocurrió un error inesperado al guardar."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg">
      {step === 1 && (
        <>
          <Text variant={"subtitle"}>Información General</Text>
          <hr className="border-gray-400" />

          <p className="mt-3 mb-4 text-sm text-gray-700">
            Empresa:&nbsp;
            <span className="font-semibold text-blue-700">
              {empresaNombre}
            </span>
          </p>

          <div className="my-5 grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
            <Select
              values={tiposOperacion}
              selected={operacion}
              setSelected={setOperacion}
              className="w-full"
              label="Selecciona el tipo de Operación del documento*: "
            />
            <CalendarMonth
              label="Periodo en el que irá la factura*: "
              date={date}
              setDate={setDate}
            />
          </div>

          <div className="flex justify-end mt-8">
            <Button
              type="button"
              className="w-60"
              loading={loading}
              onClick={handleValidate}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Text variant={"subtitle"}>Información del documento</Text>
          <hr className="border-gray-400" />

          <div className="my-5 grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
            <CalendarForm
              label="Fecha de emisión*: "
              placeholder="Elige la fecha de emisión"
              name="fecha_emision"
              value={formData.fecha_emision}
              onChange={(dateArr) =>
                handleDateChange(dateArr, "fecha_emision")
              }
              errorMessage={errors.fecha_emision}
            />
            <CalendarForm
              label="Fecha de anulación (si aplica): "
              placeholder="Elige la fecha de anulación"
              name="fecha_anulacion"
              value={formData.fecha_anulacion ?? null} // ✅ aquí va null, no ""
              onChange={(dateArr) =>
                handleDateChange(dateArr, "fecha_anulacion")
              }
              errorMessage={errors.fecha_anulacion}
            />
            <Select
              values={tiposDte}
              selected={dte}
              setSelected={setDte}
              className="w-full"
              label="Selecciona el tipo de DTE para el documento*: "
            />
            <Select
              values={tiposDocumento}
              selected={transaction}
              setSelected={setTransaction}
              className="w-full"
              label="Selecciona el tipo de la transacción*: "
            />
            <Select
              values={monedasOptions}
              selected={moneda}
              setSelected={setMoneda}
              className="w-full"
              label="Selecciona la moneda del documento*: "
            />
            <Input
              label="Número de Autorización:*"
              placeholder="Ingresa el Número de Autorización"
              name="numero_autorizacion"
              value={formData.numero_autorizacion}
              onChange={handleChange}
              errorMessage={errors.numero_autorizacion}
            />
            <Input
              label="Número de Serie:*"
              placeholder="Ingresa el Número de Serie"
              name="serie"
              value={formData.serie}
              onChange={handleChange}
              errorMessage={errors.serie}
            />
            <Input
              label="Número de DTE:*"
              placeholder="Ingresa el Número de DTE"
              name="numero_dte"
              value={formData.numero_dte}
              onChange={handleChange}
              errorMessage={errors.numero_dte}
            />

            {operacion.value === "compra" && (
              <>
                <Input
                  label="Nombre del Emisor*"
                  placeholder="Ingresa el nombre del Emisor"
                  name="nombre_emisor"
                  value={formData.nombre_emisor}
                  onChange={handleChange}
                  errorMessage={errors.nombre_emisor}
                />
                <Input
                  label="NIT del Emisor:*"
                  placeholder="Ingresa el NIT del Emisor"
                  name="nit_emisor"
                  value={formData.nit_emisor}
                  onChange={handleChange}
                  errorMessage={errors.nit_emisor}
                  type="text"
                />
              </>
            )}

            {operacion.value === "venta" && (
              <>
                <Input
                  label="Nombre del Receptor*"
                  placeholder="Ingresa el nombre del Receptor"
                  name="nombre_receptor"
                  value={formData.nombre_receptor}
                  onChange={handleChange}
                  errorMessage={errors.nombre_receptor}
                />
                <Input
                  label="ID del Receptor:*"
                  placeholder="Ingresa el ID del Receptor"
                  name="id_receptor"
                  value={formData.id_receptor}
                  onChange={handleChange}
                  errorMessage={errors.id_receptor}
                  type="number"
                />
              </>
            )}

            <Input
              label="Nombre del establecimiento*"
              placeholder="Ingresa el nombre del establecimiento"
              name="nombre_de_establecimiento"
              value={formData.nombre_de_establecimiento}
              onChange={handleChange}
              errorMessage={errors.nombre_de_establecimiento}
            />
            <Input
              label="Número del establecimiento*"
              placeholder="Ingresa el Número del establecimiento"
              name="numero_de_establecimiento"
              value={formData.numero_de_establecimiento}
              onChange={handleChange}
              errorMessage={errors.numero_de_establecimiento}
              type="number"
            />

            <Select
              values={cuentas}
              selected={cuentaDebe}
              setSelected={setCuentaDebe}
              className="w-full"
              label="Selecciona la cuenta para DEBE*: "
              loading={isFetching}
              isOptionDisabled={(option) => option.nivel <= 3}
              top
            />
            <Select
              values={cuentas}
              selected={cuentaHaber}
              setSelected={setCuentaHaber}
              className="w-full"
              label="Selecciona la cuenta para HABER*: "
              loading={isFetching}
              isOptionDisabled={(option) => option.nivel <= 3}
              top
            />

            <CheckBox
              label={"Marcar como exportación: "}
              checked={formData.importacion}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  importacion: e.target.checked,
                }))
              }
            />
          </div>

          <div className="flex justify-between mt-8">
            <Button
              type="button"
              className="w-60"
              onClick={() => setStep(1)}
            >
              Atrás
            </Button>
            <Button
              type="button"
              className="w-60"
              loading={loading}
              onClick={() => setStep(3)}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Text variant={"subtitle"}>Detalles del documento</Text>
          <hr className="border-gray-400" />

          <div className="my-5 grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
            <Input
              label="Monto Total:*"
              placeholder="Ingresa el monto total"
              name="monto_total"
              value={formData.monto_total}
              onChange={handleChange}
              errorMessage={errors.monto_total}
              type="number"
            />
            <Input
              label="IVA:"
              placeholder="Ingresa el IVA"
              name="iva"
              value={formData.iva}
              onChange={handleChange}
              errorMessage={errors.iva}
              type="number"
            />
            <Input
              label="Petróleo:"
              placeholder="Ingresa el monto de petróleo"
              name="petroleo"
              value={formData.petroleo}
              onChange={handleChange}
              errorMessage={errors.petroleo}
              type="number"
            />
            <Input
              label="Turismo Hospedaje:"
              placeholder="Ingresa el monto de turismo y hospedaje"
              name="turismo_hospedaje"
              value={formData.turismo_hospedaje}
              onChange={handleChange}
              errorMessage={errors.turismo_hospedaje}
              type="number"
            />
            <Input
              label="Turismo Pasajes:"
              placeholder="Ingresa el monto de turismo y pasajes"
              name="turismo_pasajes"
              value={formData.turismo_pasajes}
              onChange={handleChange}
              errorMessage={errors.turismo_pasajes}
              type="number"
            />
            <Input
              label="Timbre de Prensa:"
              placeholder="Ingresa el monto de timbre de prensa"
              name="timbre_prensa"
              value={formData.timbre_prensa}
              onChange={handleChange}
              errorMessage={errors.timbre_prensa}
              type="number"
            />
            <Input
              label="Bomberos:"
              placeholder="Ingresa el monto de bomberos"
              name="bomberos"
              value={formData.bomberos}
              onChange={handleChange}
              errorMessage={errors.bomberos}
              type="number"
            />
            <Input
              label="Tasa Municipal:"
              placeholder="Ingresa la tasa municipal"
              name="tasa_municipal"
              value={formData.tasa_municipal}
              onChange={handleChange}
              errorMessage={errors.tasa_municipal}
              type="number"
            />
            <Input
              label="Bebidas Alcohólicas:"
              placeholder="Ingresa el monto de bebidas alcohólicas"
              name="bebidas_alcoholicas"
              value={formData.bebidas_alcoholicas}
              onChange={handleChange}
              errorMessage={errors.bebidas_alcoholicas}
              type="number"
            />
            <Input
              label="Tabaco:"
              placeholder="Ingresa el monto de tabaco"
              name="tabaco"
              value={formData.tabaco}
              onChange={handleChange}
              errorMessage={errors.tabaco}
              type="number"
            />
            <Input
              label="Cemento:"
              placeholder="Ingresa el monto de cemento"
              name="cemento"
              value={formData.cemento}
              onChange={handleChange}
              errorMessage={errors.cemento}
              type="number"
            />
            <Input
              label="Bebidas no Alcohólicas:"
              placeholder="Ingresa el monto de bebidas no alcohólicas"
              name="bebidas_no_alcoholicas"
              value={formData.bebidas_no_alcoholicas}
              onChange={handleChange}
              errorMessage={errors.bebidas_no_alcoholicas}
              type="number"
            />
            <Input
              label="Tarifa Portuaria:"
              placeholder="Ingresa el monto de la tarifa portuaria"
              name="tarifa_portuaria"
              value={formData.tarifa_portuaria}
              onChange={handleChange}
              errorMessage={errors.tarifa_portuaria}
              type="number"
            />
          </div>

          <div className="flex justify-between mt-8">
            <Button
              type="button"
              className="w-60"
              onClick={() => setStep(2)}
            >
              Atrás
            </Button>
            <Button
              type="submit"
              className="w-60"
              loading={loading}
            >
              Guardar Documento
            </Button>
          </div>
        </>
      )}
    </form>
  );
};

/* =========================================================
 *  Catálogos locales (mismo que en Conta Cox, reusado en GNIO)
 * ======================================================= */

const monedasOptions = [
  { value: "GTQ", label: "Quetzal" },
  { value: "USD", label: "Dólar estadounidense" },
  { value: "SVC", label: "Colones Salvadoreños" },
  { value: "NIO", label: "Córdobas Nicaragüenses" },
  { value: "DKK", label: "Corona Danesa" },
  { value: "NOK", label: "Corona Noruega" },
  { value: "SEK", label: "Coronas Sueca" },
  { value: "CAD", label: "Dólares Canadienses" },
  { value: "HKD", label: "Dólar Hong Kong" },
  { value: "TWD", label: "Dólar Taiwán" },
  { value: "PTE", label: "Escudo Portugués" },
  { value: "EUR", label: "Euro" },
  { value: "CHF", label: "Francos Suizos" },
  { value: "HNL", label: "Lempiras Hondureños" },
  { value: "GBP", label: "Libras Esterlinas" },
  { value: "ARS", label: "Peso Argentina" },
  { value: "DOP", label: "Peso Dominicano" },
  { value: "COP", label: "Pesos colombianos" },
  { value: "MXN", label: "Pesos Mexicanos" },
  { value: "BRL", label: "Real Brasileño" },
  { value: "MYR", label: "Ringgit Malasia" },
  { value: "INR", label: "Rupia India" },
  { value: "PKR", label: "Rupia Pakistán" },
  { value: "KPW", label: "Won Coreano" },
  { value: "JPY", label: "Yenes Japoneses" },
];

const tiposDte = [
  { value: "FACT", label: "Factura" },
  { value: "FCAM", label: "Factura Cambiaria" },
  { value: "FPEQ", label: "Factura Pequeño Contribuyente" },
  { value: "FCAP", label: "Factura Cambiaria Pequeño Contribuyente" },
  { value: "FESP", label: "Factura Especial" },
  { value: "NABN", label: "Nota de Abono" },
  { value: "RDON", label: "Recibo por Donación" },
  { value: "RECI", label: "Recibo" },
  { value: "NDEB", label: "Nota de Débito" },
  { value: "NCRE", label: "Nota de Crédito" },
];

const tiposOperacion = [
  { value: "compra", label: "Compra" },
  { value: "venta", label: "Venta" },
];
