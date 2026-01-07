import clsx from 'clsx';
import React from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    disabled: boolean;
}

export const TableInput = ({
    className= "",
    disabled = false,
    ...rest
}: Props) => {
    return (
        <input
            className={clsx(
                'border rounded-lg px-3 py-2 mt-1 text-sm w-full bg-white input-type-number',
                {
                    '!bg-gray-200 cursor-not-allowed': disabled
                },
                className
            )}
            disabled={disabled}
            {...rest}
        />
    );
};
