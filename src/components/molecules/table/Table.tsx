'use client';
import React from 'react';
import type {
  ConditionalStyles,
  TableColumn,
  TableStyles,
} from 'react-data-table-component';
import DataTable from 'react-data-table-component';
import { LoadingComponent, NoDataComponent } from './utils';
import { inter } from '@/utils/fonts';

interface props {
  columns: TableColumn<any>[];
  rows: any;
  pending: boolean;
  onSort?: any;
  noDataText?: string;
  pagination?: boolean;
  striped?: boolean;
  onRowClicked?:
    | ((row: any, e: React.MouseEvent<Element, MouseEvent>) => void)
    | undefined;
  conditionalRowStyles?: ConditionalStyles<any>[] | undefined;
  className?: string;
}

export const Table = ({
  columns = [],
  rows,
  pending,
  noDataText = 'No se encontraron registros',
  pagination,
  striped,
  onRowClicked,
  conditionalRowStyles: conditionalStyles,
  className = '',
}: props) => {
  const conditionalRowStyles = [
    {
      when: () => true,
      style: {
        '&:hover': {
          backgroundColor: '#c9c9c9',
          cursor: 'pointer',
        },
      },
    },
    ...(conditionalStyles ?? []),
  ];

  // 🧹 Filtrar props inválidas como minWidth
  const sanitizedColumns = columns.map((col: any) => {
    const { minWidth, ...rest } = col;
    return {
      ...rest,
      style: {
        ...((col.style as any) || {}),
        ...(minWidth ? { minWidth } : {}),
      },
    };
  });

  return (
    <div className="rounded-lg shadow-01">
      <DataTable
        columns={sanitizedColumns}
        data={rows}
        progressPending={pending}
        progressComponent={<LoadingComponent />}
        noDataComponent={<NoDataComponent text={noDataText} />}
        customStyles={customStyles}
        conditionalRowStyles={conditionalRowStyles}
        pointerOnHover
        pagination={pagination}
        striped={striped}
        onRowClicked={onRowClicked}
        className={className}
      />
    </div>
  );
};

const customStyles: TableStyles = {
  headCells: {
    style: {
      backgroundColor: '#071228',
      color: '#F4F5F7',
      fontFamily: inter.style.fontFamily,
      fontWeight: 500,
      paddingLeft: '24px',
      paddingRight: '24px',
      fontSize: '12px',
    },
  },
  cells: {
    style: {
      color: '#878787',
      fontFamily: inter.style.fontFamily,
      fontWeight: 400,
      borderBottomColor: '#E8E8E8',
      padding: '24px',
    },
  },
  rows: {
    highlightOnHoverStyle: {
      backgroundColor: '#000000',
      outlineColor: '#E8E8E8',
      transitionDuration: '0.15s',
      transitionProperty: 'background-color',
      outlineStyle: 'solid',
      outlineWidth: '1px',
    },
  },
  table: {
    style: {
      borderRadius: '8px',
    },
  },
};
