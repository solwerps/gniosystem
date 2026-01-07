//src/components/atoms/inputs/Select.tsx
'use client';
import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import type {
    StylesConfig,
    MenuPlacement,
    Options
} from 'react-select';
import ReactSelect, {
    ActionMeta,
    SingleValue,
    GroupBase
} from 'react-select';

interface OptionType {
    label: string;
    value: string | number;
    error?: string;
}

interface SelectProps {
    values: OptionType[];
    selected: OptionType;
    setSelected: (option: OptionType) => void;
    placeholder?: string;
    disabled?: boolean;
    capitalize?: boolean;
    label?: string;
    defaultValue?: string | number;
    errorMessage?: string;
    top?: boolean;
    className?: string;
    loading?: boolean;
    isOptionDisabled?: ((option: any, selectValue: Options<any>) => boolean) | undefined
    noOptionsMessage?: string;
}

interface StyleFnProps {
    hasValue?: boolean;
    isFocused?: boolean;
    isSelected?: boolean;
    isDisabled?: boolean;
    menuIsOpen?: boolean;
    data?: any;
}

export const Select: React.FC<SelectProps> = ({
    values = [],
    selected,
    setSelected,
    placeholder = 'Selecciona',
    disabled = false,
    loading = false,
    capitalize = false,
    label = 'Filtrar por:',
    defaultValue,
    errorMessage = 'Valor invalido',
    noOptionsMessage = 'No hay opciones disponibles',
    top = false,
    className = '',
    isOptionDisabled
}) => {
    let position: MenuPlacement = top ? 'top' : 'bottom';
    const showError = Boolean(selected?.error && selected?.error !== 'success');

    const onChange = (newValue: any, actionMeta: any) => {
        let action = actionMeta?.action ?? '';
        switch (action) {
            case 'clear':
                setSelected({ value: '', label: 'Selecciona', error: '' });
                break;
            case 'select-option':
                setSelected({
                    ...newValue,
                    error: !newValue.value ? 'Ah ocurrido un Error' : 'success'
                });
                break;
            default:
                setSelected({
                    ...newValue,
                    error: !newValue.value ? 'Ah ocurrido un Error' : 'success'
                });
        }
    };

    const styles: StylesConfig<OptionType, false> = {
        control: (styles, { isDisabled, isFocused }) => ({
            ...styles,
            backgroundColor: isDisabled ? '#e5e7eb' : 'white',
            borderColor: showError ? 'red' : 'none', // focus: blue-500, otherwise: gray-300
            borderWidth: '1px',
            boxShadow: isFocused ? '0 0 0 1px #064cff' : 'none', // focus: shadow-outline
            minHeight: '38px', // adjust to match input height
            borderRadius: '0.375rem', // adjust to match input border-radius
            '&:hover': {
                // borderColor: isFocused ? '#064cff' : '#D1D5DB' // hover: blue-500 if focused, otherwise: gray-300
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
        }),        
    };

    return (
        <div className={`flex flex-col w-full ${className}`}>
            {label && (
                <label className="mb-2.5 text-sm text-gray-600 font-semibold pb-1 block">
                    {label}
                </label>
            )}
            <ReactSelect
                onChange={onChange}
                options={values}
                id={`Selects ${placeholder}`}
                isSearchable
                placeholder={placeholder}
                isDisabled={disabled || loading}
                isClearable
                styles={styles}
                instanceId={`Selects ${placeholder}`}
                value={selected}
                menuPlacement={position}
                isLoading={loading}
                isOptionDisabled={isOptionDisabled}
                noOptionsMessage={() => noOptionsMessage}
            />
            <div
                className={clsx(
                    'transition-opacity duration-300 ease-in-out mt-2',
                    showError ? 'opacity-100 h-6' : 'opacity-0 h-0'
                )}
            >
                <span className={clsx('text-sm text-red-500', 'block')}>
                    {selected?.error ?? errorMessage}
                </span>
            </div>
        </div>
    );
};
