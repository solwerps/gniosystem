// src/components/organisms/cargas/UploadCuentas.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

import { DragAndDrop } from '..';
import { Select, Table, Button } from '@/components/atoms/inputs';
import type { TableColumn } from 'react-data-table-component';

import type {
  Cuenta,
  SelectOption,
  OptionType
} from '@/utils';

import {
  crearCuentas,
  obtenerNomenclaturaTipos
} from '@/utils/services/nomenclatura';

export const UploadCuentas = () => {
  const router = useRouter();

  const [cuentasFile, setCuentasFile] = useState<File[]>([]);
  const [cuentasData, setCuentasData] = useState<Cuenta[]>([]);

  // Tipos de Nomenclatura
  const [tiposLoading, setTiposLoading] = useState(true);
  const [nomenclaturaTipos, setNomenclaturaTipos] = useState<SelectOption[]>([]);
  const [nomenclaturaSelected, setNomenclaturaSelected] = useState<OptionType>({
    value: '',
    label: 'Selecciona',
    error: ''
  });

  // loaders
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getNomenclaturaTipos = async () => {
      try {
        setTiposLoading(true);
        const { status, data, message } = await obtenerNomenclaturaTipos(true);
        if (status === 200) {
          setNomenclaturaTipos(data);
        } else {
          throw new Error(message);
        }
      } catch (error) {
        console.log({ error });
        toast.error('Error al obtener los tipos de nomenclatura.');
      } finally {
        setTiposLoading(false);
      }
    };
    getNomenclaturaTipos();
  }, []);

  useEffect(() => {
    const validateCuentas = async () => {
      try {
        setValidating(true);
        const propiedades = [
          'CUENTA',
          'DESCRIPCION',
          'DEBE/HABER',
          'PRINCIPAL/DETALLE',
          'NIVEL',
          'TIPO',
          'TIPO 2'
        ];
        const validarPropiedades = cuentasData.every((objeto) =>
          propiedades.every((propiedad) => propiedad in objeto)
        );

        if (!validarPropiedades) {
          toast.error(
            'El archivo no contiene las propiedades mínimas necesarias.'
          );
          setValidating(false);
          return;
        }
      } catch (error) {
        console.log(error);
      } finally {
        setValidating(false);
      }
    };

    if (cuentasData.length > 0) {
      validateCuentas();
    }
  }, [cuentasData]);

  const submitCuentas = async () => {
    try {
      if (!nomenclaturaSelected.value) {
        toast.error('Debe seleccionar un tipo de nomenclatura.');
        return;
      }

      if (cuentasData.length === 0) {
        toast.error('No hay cuentas para guardar.');
        return;
      }

      setLoading(true);

      const nomenclatura_contable_id = Number(nomenclaturaSelected.value);
      const { status, message } = await crearCuentas(
        cuentasData,
        nomenclatura_contable_id
      );

      if (status === 200) {
        toast.success('Cuentas creadas correctamente');
        router.push('/nomenclatura/cuentas');
      } else {
        toast.error(message);
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Error al guardar las cuentas: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Select
        values={nomenclaturaTipos}
        selected={nomenclaturaSelected}
        setSelected={setNomenclaturaSelected}
        className="w-full"
        label="Elegir Tipo de Nomenclatura"
        loading={tiposLoading}
      />

      {cuentasData.length === 0 ? (
        <DragAndDrop
          files={cuentasFile}
          setFiles={setCuentasFile}
          beforAction={() => {}}
          setData={setCuentasData}
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={cuentasData}
            pending={validating}
          />
          <Button
            className="w-80 mx-auto"
            onClick={submitCuentas}
            loading={loading}
          >
            Guardar Datos
          </Button>
        </>
      )}
    </div>
  );
};

interface CuentaDocument {
  CUENTA: string;
  DESCRIPCION: string;
  'DEBE/HABER': string;
  'PRINCIPAL/DETALLE': string;
  NIVEL: string;
  TIPO: string;
  'TIPO 2': string;
}

const columns: TableColumn<CuentaDocument>[] = [
  {
    name: 'Cuenta',
    selector: (row) => row.CUENTA,
    sortable: true
  },
  {
    name: 'Descripción',
    selector: (row) => row.DESCRIPCION,
    sortable: true,
    grow: 2
  },
  {
    name: 'Debe/Haber',
    selector: (row) => row['DEBE/HABER'],
    sortable: true
  },
  {
    name: 'Principal/Detalle',
    selector: (row) => row['PRINCIPAL/DETALLE'],
    sortable: true
  },
  {
    name: 'Nivel',
    selector: (row) => row.NIVEL,
    sortable: true
  },
  {
    name: 'Tipo',
    selector: (row) => row.TIPO,
    sortable: true
  },
  {
    name: 'Tipo 2',
    selector: (row) => row['TIPO 2'],
    sortable: true
  }
];
