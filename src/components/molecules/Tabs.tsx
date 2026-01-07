// src/components/molecules/Tabs.tsx
'use client';

import React, { useState } from 'react';

interface List {
  title: string;
  component: React.JSX.Element;
  disabled?: boolean;
}

interface Props {
  list: List[];
}

export const Tabs: React.FC<Props> = ({ list }) => {
  // índice inicial: primer tab no deshabilitado, o 0 por defecto
  const getInitialIndex = () => {
    const idx = list.findIndex((item) => !item.disabled);
    return idx === -1 ? 0 : idx;
  };

  const [activeIndex, setActiveIndex] = useState<number>(getInitialIndex);

  const handleClick = (index: number, disabled?: boolean) => {
    if (disabled) return;
    setActiveIndex(index);
  };

  return (
    <div className="w-full">
      {/* Header de tabs */}
      <div
        role="tablist"
        className="flex border-b border-gray-200 overflow-x-auto"
      >
        {list.map((item, index) => {
          const isActive = index === activeIndex;
          const isDisabled = item.disabled;

          return (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={isDisabled}
              onClick={() => handleClick(index, isDisabled)}
              className={[
                'px-4 py-2 text-sm whitespace-nowrap border-b-2',
                'transition-colors duration-150',
                isActive
                  ? 'bg-background text-white font-bold rounded-t-md border-background'
                  : 'text-gray-600 border-transparent hover:text-gray-800 hover:bg-gray-100',
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {item.title}
            </button>
          );
        })}
      </div>

      {/* Contenido del tab activo */}
      <div className="mt-4">
        {list[activeIndex] && list[activeIndex].component}
      </div>
    </div>
  );
};
