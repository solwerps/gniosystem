//src/components/atoms/input/CheckBox.tsc
import clsx from 'clsx';
import React from 'react';

interface CheckBoxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    classNameContainer?: string;
    classNameCheckBox?: string;
    errorMessage?: string;
    disabled?: boolean;
    checked?: boolean;
}

export const CheckBox = ({
    label,
    classNameContainer,
    classNameCheckBox,
    errorMessage = '',
    disabled,
    checked,
    ...rest
}: CheckBoxProps) => {
    const showError = Boolean(errorMessage && errorMessage !== 'success');

    return (
        <div className={clsx('flex items-center', classNameContainer)}>
            <label className="font-semibold text-sm text-gray-600 pb-1 block">
                {label}
            </label>
            <label className="relative flex cursor-pointer items-center p-3">
                <input
                    type="checkbox"
                    className={clsx(
                        'before:content-[""] peer relative h-5 w-5 cursor-pointer appearance-none rounded-md border border-blue-gray-200 transition-all',
                        {
                            'checked:border-indigo-500 checked:bg-indigo-500':
                                checked,
                            'before:absolute before:top-2/4 before:left-2/4 before:h-12 before:w-12 before:-translate-y-2/4 before:-translate-x-2/4 before:rounded-full before:bg-blue-gray-500 before:opacity-0 before:transition-opacity hover:before:opacity-10':
                                !disabled
                        },
                        classNameCheckBox
                    )}
                    disabled={disabled}
                    checked={checked}
                    {...rest}
                />
                <div className="pointer-events-none absolute top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                    <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1"
                    >
                        <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                        ></path>
                    </svg>
                </div>
            </label>
            {showError && (
                <span className="text-sm text-red-500 block ml-4">
                    {errorMessage}
                </span>
            )}
        </div>
    );
};
