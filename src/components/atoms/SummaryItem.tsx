// src/components/atoms/SummaryItem.tsx
import React from 'react';
import { Text } from '@/components/atoms';
import clsx from 'clsx';

export const SummaryItem = ({
  text,
  value,
  className = '',
  success = false,
  primary = false,
  error = false,
  onChange,
}: {
  text: string;
  value: number;
  className?: string;
  success?: boolean;
  primary?: boolean;
  error?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  let valueFormated = value.toLocaleString(
    'es-MX'
    // {
    //   style: 'currency',
    //   currency: 'GTQ'
    // }
  );

  return (
    <div className={`flex items-end ${className}`}>
      <Text
        variant={'text'}
        bold
        className={clsx('mr-2', {
          '!text-basics-success': success,
          '!text-basics-error': error,
          '!text-primary': primary,
        })}
      >
        {text}
      </Text>
      <hr className="border-dashed border flex-grow" />
      {onChange ? (
        <input
          type="number"
          value={value}
          onChange={onChange}
          className="border rounded-lg px-3 py-2 mt-1 text-sm bg-gray-200 max-w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-right"
        />
      ) : (
        <Text variant={'text'} className="ml-2">
          {valueFormated}
        </Text>
      )}
    </div>
  );
};
