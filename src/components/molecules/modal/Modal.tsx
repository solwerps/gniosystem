// src/components/molecules/modal/Modal.tsx

'use client';

import React from 'react';
import clsx from 'clsx';
// ⬇️ Ajuste: traer CloseIcon desde el barrel de atoms, no desde "@/components"
import { CloseIcon } from '@/components/atoms';

interface Props {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
  title?: string;
  classname?: string;
  dontClose?: boolean;
}

export const Modal: React.FC<Props> = ({
  isOpen,
  setIsOpen,
  children,
  title = 'Modal Title',
  classname,
  dontClose = false,
}) => {
  return (
    <div
      className={clsx(
        'fixed left-0 top-0 flex h-full w-full items-center justify-center bg-black bg-opacity-50 py-10 transition-opacity duration-300',
        {
          'opacity-100 pointer-events-auto': isOpen,
          'opacity-0 pointer-events-none': !isOpen,
        }
      )}
    >
      <div
        className={clsx(
          'flex flex-col w-[520px] bg-white p-5 rounded-md transition-transform duration-300',
          classname,
          {
            'transform translate-y-0': isOpen,
            'transform -translate-y-full': !isOpen,
          }
        )}
      >
        <header className="flex justify-between items-center mb-2 border-b pb-2 ">
          <h3 className="font-bold text-xl">{title}</h3>
          {!dontClose && (
            <div
              className="border border-black rounded-full p-2 flex justify-center items-center transition-all text-black hover:text-gray-600 hover:border-gray-600 cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <CloseIcon />
            </div>
          )}
        </header>
        {children}
      </div>
    </div>
  );
};
