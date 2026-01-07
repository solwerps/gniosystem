// src/components/organisms/details/DocDetail.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { ZodError } from 'zod';

// 🧱 Atoms GNIO (import uno por uno)
import { Button } from '@/components/atoms';
import { CalendarForm } from '@/components/atoms';
import { Input } from '@/components/atoms';
import { Select } from '@/components/atoms';
import { Text } from '@/components/atoms';

// 🧩 Utils y servicios GNIO (import uno por uno)
import { obtenerDocumentoByuuid } from '@/utils/services';
import { crearFactura } from '@/utils';
import { documentoSchema } from '@/utils';
import { tiposDocumento } from '@/utils';
import type { OptionType } from '@/utils';
import type { IGetDocumento } from '@/utils';

// ===========================
// Tipos auxiliares
// ===========================
type CampoMontoKey =
  | 'monto_total'
  | 'iva'
  | 'petroleo'
  | 'turismo_hospedaje'
  | 'turismo_pasajes'
  | 'timbre_prensa'
  | 'bomberos'
  | 'tasa_municipal'
  | 'bebidas_alcoholicas'
  | 'tabaco'
  | 'cemento'
  | 'bebidas_no_alcoholicas'
  | 'tarifa_portuaria';

interface CampoMontoConfig {
  name: CampoMontoKey;
  label: string;
  placeholder: string;
}

export const DocDetail: React.FC<{ uuid: string }> = ({ uuid }) => {
  const router = useRouter();

  // ===========================
  // Estados principales
  // ===========================
  const [fetching, setFetching] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(2); // Empieza desde info documento

  // ===========================
  // Datos de selects
  // ===========================
  const [dte, setDte] = useState<OptionType>({
    value: '',
    label: 'Selecciona',
    error: '',
  });

  const [transaction, setTransaction] = useState<OptionType>({
    value: '',
    label: 'Selecciona',
    error: '',
  });

  const [moneda, setMoneda] = useState<OptionType>(monedasOptions[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ===========================
  // Documento base
  // ===========================
  const [documento, setDocumento] = useState<IGetDocumento>({
    uuid: '',
    numero_autorizacion: '',
    fecha_trabajo: new Date(),
    fecha_emision: new Date(),
    tipo_dte: '',
    serie: '',
    numero_dte: '',
    identificador_unico: '',
    nit_emisor: '',
    nombre_emisor: '',
    codigo_establecimiento: '',
    establecimiento_receptor_id: null,
    nombre_establecimiento: '',
    id_receptor: '',
    nombre_receptor: '',
    nit_certificador: '',
    nombre_certificador: '',
    moneda: 'GTQ',
    monto_total: '',
    monto_servicio: '',
    monto_bien: '',
    factura_estado: 'Vigente',
    marca_anulado: 'No',
    fecha_anulacion: null,
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
    tipo_operacion: 'venta',
    // 👉 en GNIO son number
    cuenta_debe: 0,
    cuenta_haber: 0,
    tipo: 'bien_y_servicio',
    empresa_id: 0,
    estado: 1,
    comentario: null,
  });

  // ===========================
  // Cargar documento
  // ===========================
  useEffect(() => {
    const getData = async () => {
      try {
        setFetching(true);
        const { status, data, message } = await obtenerDocumentoByuuid(uuid);

        if (status === 200) {
          setDocumento(data);
        } else {
          throw new Error(`Error al obtener documento: ${message}`);
        }
      } catch (error) {
        console.error(error);
        toast.error('No se pudo obtener la información del documento.');
      } finally {
        setFetching(false);
      }
    };

    getData();
  }, [uuid]);

  // ===========================
  // Handlers
  // ===========================
  const handleDateChange = (
    date: Date | null,
    name: keyof IGetDocumento
  ) => {
    if (!date) return;
    setDocumento((prev) => ({
      ...prev,
      [name]: date,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    setDocumento((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? (value === '' ? 0 : parseFloat(value))
          : value,
    }));
  };

  // ===========================
  // Guardar documento
  // ===========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validación con Zod
      documentoSchema.parse(documento);

      // crearFactura espera IFactura; casteamos para TS
      const { status, message } = await crearFactura(documento as any);

      if (status === 200) {
        toast.success('Documento guardado correctamente.');
        router.push('/dashboard/documentos');
      } else {
        toast.error(message || 'Error al guardar el documento.');
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};

        // En versiones recientes de Zod la propiedad es "issues"
        error.issues.forEach((issue) => {
          const fieldName = issue.path[0];
          if (typeof fieldName === 'string') {
            newErrors[fieldName] = issue.message;
          }
        });

        setErrors(newErrors);
        toast.error('Datos inválidos. Verifique la información.');
      } else {
        console.error(error);
        toast.error('Error inesperado al guardar el documento.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // Render
  // ===========================
  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg">
      {step === 2 && (
        <>
          <Text variant="subtitle">Información del Documento:</Text>
          <hr className="border-gray-400 mb-5" />

          <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
            <CalendarForm
              label="Fecha de emisión *"
              placeholder="Selecciona la fecha de emisión"
              name="fecha_emision"
              value={documento.fecha_emision}
              onChange={(date: Date | null) =>
                handleDateChange(date, 'fecha_emision')
              }
              errorMessage={errors.fecha_emision}
            />

            <CalendarForm
              label="Fecha de anulación (si aplica)"
              placeholder="Selecciona la fecha de anulación"
              name="fecha_anulacion"
              value={documento.fecha_anulacion}
              onChange={(date: Date | null) =>
                handleDateChange(date, 'fecha_anulacion')
              }
              errorMessage={errors.fecha_anulacion}
            />

            <Select
              values={tiposDte}
              selected={dte}
              setSelected={setDte}
              className="w-full"
              label="Tipo de DTE *"
            />

            <Select
              values={tiposDocumento}
              selected={transaction}
              setSelected={setTransaction}
              className="w-full"
              label="Tipo de transacción *"
            />

            <Select
              values={monedasOptions}
              selected={moneda}
              setSelected={setMoneda}
              className="w-full"
              label="Moneda *"
            />

            <Input
              label="Número de Autorización *"
              name="numero_autorizacion"
              value={documento.numero_autorizacion}
              onChange={handleChange}
              placeholder="Ingresa el número de autorización"
              errorMessage={errors.numero_autorizacion}
            />

            <Input
              label="Serie *"
              name="serie"
              value={documento.serie}
              onChange={handleChange}
              placeholder="Ingresa el número de serie"
              errorMessage={errors.serie}
            />

            <Input
              label="Número de DTE *"
              name="numero_dte"
              value={documento.numero_dte}
              onChange={handleChange}
              placeholder="Ingresa el número de DTE"
              errorMessage={errors.numero_dte}
            />

            {documento.tipo_operacion === 'compra' ? (
              <>
                <Input
                  label="Nombre del Emisor *"
                  name="nombre_emisor"
                  value={documento.nombre_emisor}
                  onChange={handleChange}
                  placeholder="Ingresa el nombre del emisor"
                  errorMessage={errors.nombre_emisor}
                />
                <Input
                  label="NIT del Emisor *"
                  name="nit_emisor"
                  value={documento.nit_emisor}
                  onChange={handleChange}
                  placeholder="Ingresa el NIT del emisor"
                  errorMessage={errors.nit_emisor}
                />
              </>
            ) : (
              <>
                <Input
                  label="Nombre del Receptor *"
                  name="nombre_receptor"
                  value={documento.nombre_receptor}
                  onChange={handleChange}
                  placeholder="Ingresa el nombre del receptor"
                  errorMessage={errors.nombre_receptor}
                />
                <Input
                  label="ID del Receptor *"
                  name="id_receptor"
                  value={documento.id_receptor}
                  onChange={handleChange}
                  placeholder="Ingresa el ID del receptor"
                  errorMessage={errors.id_receptor}
                  type="text"
                />
              </>
            )}

            <Input
              label="Nombre del Establecimiento *"
              name="nombre_establecimiento"
              value={documento.nombre_establecimiento ?? ''}
              onChange={handleChange}
              placeholder="Nombre del establecimiento"
              errorMessage={errors.nombre_establecimiento}
            />

            <Input
              label="Código del Establecimiento *"
              name="codigo_establecimiento"
              value={documento.codigo_establecimiento}
              onChange={handleChange}
              placeholder="Código del establecimiento"
              errorMessage={errors.codigo_establecimiento}
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
              onClick={() => setStep(3)}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Text variant="subtitle">Detalles del Documento:</Text>
          <hr className="border-gray-400 mb-5" />

          <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
            {camposMontos.map((campo) => {
              const value =
                documento[campo.name] as unknown as number | string;
              return (
                <Input
                  key={campo.name}
                  label={campo.label}
                  name={campo.name}
                  value={value ?? ''}
                  onChange={handleChange}
                  placeholder={campo.placeholder}
                  errorMessage={errors[campo.name]}
                  type="number"
                />
              );
            })}
          </div>

          <div className="flex justify-between mt-8">
            <Button
              type="button"
              className="w-60"
              onClick={() => setStep(2)}
            >
              Atrás
            </Button>
            <Button type="submit" className="w-60" loading={loading}>
              Guardar Documento
            </Button>
          </div>
        </>
      )}
    </form>
  );
};

// ===========================
// Constantes
// ===========================
const monedasOptions: OptionType[] = [
  { value: 'GTQ', label: 'Quetzal', error: '' },
  { value: 'USD', label: 'Dólar estadounidense', error: '' },
  { value: 'EUR', label: 'Euro', error: '' },
  { value: 'HNL', label: 'Lempira Hondureño', error: '' },
  { value: 'MXN', label: 'Peso Mexicano', error: '' },
  { value: 'COP', label: 'Peso Colombiano', error: '' },
  { value: 'ARS', label: 'Peso Argentino', error: '' },
];

const tiposDte: OptionType[] = [
  { value: 'FACT', label: 'Factura', error: '' },
  { value: 'FCAM', label: 'Factura Cambiaria', error: '' },
  { value: 'FPEQ', label: 'Factura Pequeño Contribuyente', error: '' },
  { value: 'FESP', label: 'Factura Especial', error: '' },
  { value: 'NCRE', label: 'Nota de Crédito', error: '' },
  { value: 'NDEB', label: 'Nota de Débito', error: '' },
  { value: 'RECI', label: 'Recibo', error: '' },
  { value: 'NABN', label: 'Nota de Abono', error: '' },
];

const camposMontos: CampoMontoConfig[] = [
  {
    name: 'monto_total',
    label: 'Monto Total *',
    placeholder: 'Monto total del documento',
  },
  { name: 'iva', label: 'IVA', placeholder: 'Monto del IVA' },
  { name: 'petroleo', label: 'Petróleo', placeholder: 'Monto de petróleo' },
  {
    name: 'turismo_hospedaje',
    label: 'Turismo Hospedaje',
    placeholder: 'Monto de turismo y hospedaje',
  },
  {
    name: 'turismo_pasajes',
    label: 'Turismo Pasajes',
    placeholder: 'Monto de turismo y pasajes',
  },
  {
    name: 'timbre_prensa',
    label: 'Timbre de Prensa',
    placeholder: 'Monto de timbre de prensa',
  },
  { name: 'bomberos', label: 'Bomberos', placeholder: 'Monto de bomberos' },
  {
    name: 'tasa_municipal',
    label: 'Tasa Municipal',
    placeholder: 'Monto de tasa municipal',
  },
  {
    name: 'bebidas_alcoholicas',
    label: 'Bebidas Alcohólicas',
    placeholder: 'Monto de bebidas alcohólicas',
  },
  { name: 'tabaco', label: 'Tabaco', placeholder: 'Monto de tabaco' },
  { name: 'cemento', label: 'Cemento', placeholder: 'Monto de cemento' },
  {
    name: 'bebidas_no_alcoholicas',
    label: 'Bebidas No Alcohólicas',
    placeholder: 'Monto de bebidas no alcohólicas',
  },
  {
    name: 'tarifa_portuaria',
    label: 'Tarifa Portuaria',
    placeholder: 'Monto de tarifa portuaria',
  },
];
