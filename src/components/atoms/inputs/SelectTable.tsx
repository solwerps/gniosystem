//src/components/atoms/input/SelectTable.tsx
'use client';
import clsx from 'clsx';
import React from 'react';
import ReactSelect, { MenuPlacement, Options, StylesConfig } from 'react-select';

interface OptionType {
    label: string;
    value: string | number;
    error?: string;
}

interface SelectTableProps {
    values: OptionType[];
    value: any;
    onChange: (newValue: any) => void;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    isOptionDisabled?: ((option: any, selectValue: Options<any>) => boolean) | undefined;
    top?: boolean;
}

export const SelectTable: React.FC<SelectTableProps> = ({
    values,
    value,
    onChange,
    placeholder = 'Selecciona',
    disabled = false,
    loading = false,
    isOptionDisabled,
    top = false,
}) => {
    let position: MenuPlacement = top ? 'top' : 'bottom';
    const styles: StylesConfig<OptionType, false> = {
        control: (styles, { isDisabled, isFocused }) => ({
            ...styles,
            backgroundColor: isDisabled ? '#e5e7eb' : 'white',
            borderWidth: '1px',
            boxShadow: isFocused ? '0 0 0 1px #064cff' : 'none', // focus: shadow-outline
            minHeight: '38px', // adjust to match input height
            borderRadius: '0.375rem', // adjust to match input border-radius
            '&:hover': {
                borderColor: isFocused ? '#064cff' : '#D1D5DB' // hover: blue-500 if focused, otherwise: gray-300
            },
            cursor: isDisabled ? 'not-allowed' : 'default'
        }),
        input: (styles) => ({
            ...styles,
            color: '#4B5563', // text-gray-700
            '& input': {
                font: 'inherit'
            }
        }),
        placeholder: (styles) => ({
            ...styles,
            color: '#9CA3AF' // text-gray-400
        }),
        singleValue: (styles) => ({
            ...styles,
            color: '#111827' // text-gray-900
        }),
        menu: (styles) => ({
            ...styles,
            zIndex: 100
        }),
        option: (styles, { isFocused, isSelected, isDisabled }) => ({
            ...styles,
            backgroundColor: clsx({
                '#4F46E5': isSelected && isFocused && !isDisabled, // active: azul-500 cuando está seleccionada y enfocada
                '#064cff': isSelected && !isFocused && !isDisabled, // seleccionada
                '#E0E7FF': !isSelected && isFocused && !isDisabled, // enfocada
                '#FFFFFF': !isSelected && !isFocused && !isDisabled, // fondo blanco por defecto
                '#D1D5DB': isDisabled
            }),
            color: isSelected ? 'white' : '#111827', // texto blanco si está seleccionada, de lo contrario gris oscuro
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            '&:active': {
                backgroundColor: '#4F46E5', // activa: azul-500
                color: 'white'
            },
            '&:hover': {
                backgroundColor: clsx({
                    '#4F46E5': isSelected && !isDisabled, // fondo azul más oscuro si está seleccionada
                    '#064cff': !isSelected && !isDisabled // fondo azul si no está seleccionada
                }),
                color: clsx({
                    'white' : !isDisabled
                })
            },
        })
    };
    return (
        <div className='relative w-full'>
            <ReactSelect
                options={values}
                onChange={onChange}
                value={values.filter((item) => item.value == value)}
                placeholder={placeholder}
                isDisabled={disabled || loading}
                isLoading={loading}
                styles={styles}
                classNamePrefix="react-select"
                menuPlacement={position}
                menuPosition="fixed" 
                menuShouldScrollIntoView={false}
                isOptionDisabled={isOptionDisabled}
            />
        </div>
    );
};
