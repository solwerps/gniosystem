//src/components/atoms/input/input.tsx
import clsx from 'clsx';
import React from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    classNameContainer?: string;
    classNameInput?: string;
    errorMessage?: string;
    disabled?: boolean;
}

export const Input = ({
    label,
    classNameContainer,
    classNameInput,
    errorMessage = '',
    disabled,
    ...rest
}: Props) => {
    const showError = Boolean(errorMessage && errorMessage !== 'success');
    return (
        <div className={clsx('', classNameContainer)}>
            <label
                className={clsx(
                    'font-semibold text-sm text-gray-600 pb-1 block'
                )}
            >
                {label}
            </label>
            <input
                type="text"
                className={clsx(
                    'border rounded-lg px-3 py-2 mt-1 text-sm w-full bg-transparent input-type-number',
                    {
                        'border-red-500': showError,
                        '!bg-gray-200 cursor-not-allowed': disabled
                    },
                    classNameInput
                )}
                disabled={disabled}
                {...rest}
            />
            <div
                className={clsx(
                    'transition-opacity duration-300 ease-in-out mt-2',
                    showError ? 'opacity-100 h-6' : 'opacity-0 h-0'
                )}
            >
                <span className={clsx('text-sm text-red-500', 'block')}>
                    {errorMessage}
                </span>
            </div>
        </div>
    );
};
