// src/components/organisms/files/DragAndDrop.tsx
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { ReportIcon } from '@/components/atoms';
import {
  FilledComponente,
  LoadingComponent
} from '@/components/molecules/table/utils';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

interface DragAndDropFileProps {
  setFiles: Dispatch<SetStateAction<File[]>>;      // Actualiza el estado de files
  files: File[];                                  // Archivos cargados
  beforAction?: () => void;                       // Función a ejecutar antes de la acción
  setData: (data: any) => void;                   // Actualiza el estado con los datos procesados
  validated?: boolean;
  itemCounter?: number;
  range?: number;
}

export const DragAndDrop = ({
  setFiles,
  files,
  beforAction,
  setData,
  validated,
  itemCounter,
  range
}: DragAndDropFileProps) => {
  const filesTypesAccepted = {
    'application/vnd.ms-excel': ['.xls', '.xlsx', '.csv'] // Acepta Excel y CSV
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

      setFiles([...files, acceptedFiles[0]]);

      const file = acceptedFiles[0];
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        const buffer = e.target?.result as ArrayBuffer;
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const json = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          dateNF: 'dd"/"mm"/"yyyy',
          range
        });

        setData(json);
      };

      reader.readAsArrayBuffer(file);

      beforAction && beforAction();
    },
    accept: filesTypesAccepted
  });

  return (
    <>
      {validated ? (
        <FilledComponente itemCounter={itemCounter ?? 0} />
      ) : (
        <div {...getRootProps({ className: 'dropzone w-full' })}>
          <input
            className="input-zone"
            accept="application/vnd.ms-excel"
            {...getInputProps()}
          />
          <div className="flex justify-center items-center bg-white text-background p-8 rounded-2xl cursor-pointer shadow-md min-h-40">
            <div className="dropzone-content flex text-center flex-col justify-center items-center">
              <ReportIcon />
              Arrastra y suelta tus archivos o
              <span className="text-background font-semibold underline underline-offset-4">
                {' '}
                Busca en tu ordenador
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
