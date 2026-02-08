// src/components/organisms/cargas/UploadEmpresas.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import type { TableColumn } from 'react-data-table-component';

import { DragAndDrop } from '@/components/organisms/files';
import { Button } from '@/components/atoms';
import { Table } from '@/components/molecules';

type EmpresaUploadRow = {
  nombre: string;
  nit: string;
  sectorEconomico: string;
  razonSocial: 'Individual' | 'Juridico';
};

interface UploadEmpresasProps {
  tenantSlug: string;
}

const HEADER_MAP: Record<string, keyof EmpresaUploadRow> = {
  nombredeempresa: 'nombre',
  nombreempresa: 'nombre',
  nombre: 'nombre',
  empresa: 'nombre',
  nit: 'nit',
  sectoreconomico: 'sectorEconomico',
  sector: 'sectorEconomico',
  razonsocial: 'razonSocial',
};

export const UploadEmpresas: React.FC<UploadEmpresasProps> = ({ tenantSlug }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [rows, setRows] = useState<EmpresaUploadRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rawRows.length === 0) {
      setRows([]);
      return;
    }

    const parsed: EmpresaUploadRow[] = [];
    const invalid: number[] = [];

    rawRows.forEach((row, idx) => {
      const mapped = mapRow(row);
      if (!mapped) {
        invalid.push(idx + 1);
      } else {
        parsed.push(mapped);
      }
    });

    if (invalid.length > 0) {
      toast.error(
        `Archivo invalido. Filas con datos incompletos: ${invalid
          .slice(0, 8)
          .join(', ')}${invalid.length > 8 ? '...' : ''}`
      );
      setRows([]);
      return;
    }

    setRows(parsed);
  }, [rawRows]);

  const columns: TableColumn<EmpresaUploadRow>[] = useMemo(
    () => [
      { name: 'Nombre de empresa', selector: (row) => row.nombre, grow: 2 },
      { name: 'NIT', selector: (row) => row.nit },
      { name: 'Sector Economico', selector: (row) => row.sectorEconomico, grow: 2 },
      { name: 'Razon Social', selector: (row) => row.razonSocial },
    ],
    []
  );

  const submitEmpresas = async () => {
    if (!rows.length) {
      toast.error('No hay datos para cargar.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/empresas/masivo?tenant=${tenantSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresas: rows }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j?.error || 'No se pudo cargar las empresas.');
        return;
      }

      const created = Number(j?.created ?? 0);
      const errors = Array.isArray(j?.errors) ? j.errors.length : 0;
      if (created > 0) {
        toast.success(`Empresas creadas: ${created}.`);
      }
      if (errors > 0) {
        toast.warn(`Registros omitidos: ${errors}.`);
      }

      setFiles([]);
      setRows([]);
      setRawRows([]);
    } catch (err: any) {
      console.error(err);
      toast.error('Error al cargar empresas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {rows.length === 0 ? (
        <DragAndDrop
          files={files}
          setFiles={setFiles}
          beforAction={() => {}}
          setData={setRawRows}
        />
      ) : (
        <>
          <Table columns={columns} rows={rows} pending={false} />
          <Button className="w-80 mx-auto" onClick={submitEmpresas} loading={loading}>
            Guardar Datos
          </Button>
        </>
      )}
    </div>
  );
};

function normalizeKey(value: string) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeCell(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d+(\.0+)?$/.test(raw)) return raw.replace(/\.0+$/, '');
  return raw;
}

function normalizeRazonSocial(value: string): EmpresaUploadRow['razonSocial'] | null {
  const raw = normalizeKey(value);
  if (!raw) return null;
  if (raw.includes('jurid')) return 'Juridico';
  if (raw.includes('individual')) return 'Individual';
  return null;
}

function mapRow(row: Record<string, any>): EmpresaUploadRow | null {
  const acc: Partial<EmpresaUploadRow> = {};

  Object.entries(row || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeKey(key);
    const field = HEADER_MAP[normalizedKey];
    if (!field) return;

    if (field === 'razonSocial') {
      acc.razonSocial = normalizeRazonSocial(String(value ?? '')) ?? undefined;
      return;
    }

    acc[field] = normalizeCell(value);
  });

  if (!acc.nombre || !acc.nit || !acc.sectorEconomico || !acc.razonSocial) {
    return null;
  }

  return {
    nombre: acc.nombre,
    nit: acc.nit,
    sectorEconomico: acc.sectorEconomico,
    razonSocial: acc.razonSocial,
  };
}
