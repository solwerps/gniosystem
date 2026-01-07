// src/components/organisms/files/UploadFacturasCSV.tsx
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { CSVIcon, ReportIcon } from '@/components/atoms';
import {
  FilledComponente,
  LoadingComponent
} from '@/components/molecules/table/utils';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import type { IUploadDocumento } from '@/utils/models/documentos';

interface DragAndDropFileProps {
  setFiles: Dispatch<SetStateAction<File[]>>; // Actualiza estado de files
  files: File[];                              // Archivos cargados
  setData: Dispatch<SetStateAction<IUploadDocumento[]>>; // Datos procesados del Excel/CSV
  validated?: boolean;
  itemCounter?: number;
}

export const UploadFacturasCSV = ({
  setFiles,
  files,
  setData,
  validated,
  itemCounter
}: DragAndDropFileProps) => {
  const filesTypesAccepted = {
    'application/vnd.ms-excel': ['.xls', '.xlsx', '.csv']
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) {
        return toast.error('Formato de archivo inválido');
      }

      if (acceptedFiles[0].size / 1024 > 8000) {
        return toast.error(
          'Tamaño de archivo permitido excedido (Máximo 8mb)'
        );
      }

      // mismo comportamiento que Conta Cox
      setFiles([...files, acceptedFiles[0]]);

      const file = acceptedFiles[0];
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        const buffer = e.target?.result as ArrayBuffer;
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<IUploadDocumento>(sheet);
        setData(json);
      };

      reader.readAsArrayBuffer(file);
    },
    accept: filesTypesAccepted
  });

  const clearFilesAndData = () => {
    setFiles([]);
    setData([]);
  };

  return (
    <>
      {validated ? (
        <FilledComponente
          itemCounter={itemCounter ?? 0}
          action={clearFilesAndData}
        />
      ) : (
        <div {...getRootProps({ className: 'dropzone w-full' })}>
          <input
            className="input-zone"
            accept="application/vnd.ms-excel"
            {...getInputProps()}
          />
          <div className="flex justify-center items-center bg-white text-background p-8 rounded-2xl cursor-pointer shadow-md min-h-40">
            <div className="dropzone-content flex text-center flex-col justify-center items-center">
              <CSVIcon />
              Arrastra y suelta el excel ó
              <span className="text-background font-semibold underline underline-offset-4">
                Busca en tu ordenador
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
