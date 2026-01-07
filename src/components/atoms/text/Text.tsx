//src/components/atom/text/Text.tsx
import React from 'react';
import clsx from 'clsx';
import { montserrat } from '@/utils/fonts';

interface TextProps {
    children: React.ReactNode;
    variant: 'title' | 'subtitle' | 'text' | 'paragraph' | 'small';
    className?: string;
    bold?: boolean;
    semibold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

export const Text: React.FC<TextProps> = ({
    children,
    variant,
    className,
    bold,
    semibold,
    italic,
    underline
}) => {
    const baseClasses = {
        title: 'text-4xl',
        subtitle: 'text-2xl',
        text: 'text-base',
        paragraph: 'text-base my-2',
        small: 'text-sm'
    };

    return (
        <div
            className={clsx(
                'text-black',
                baseClasses[variant],
                montserrat.className,
                [
                    {
                        'font-bold': bold,
                        'font-semibold': semibold,
                        underline: underline,
                        italic: italic
                    }
                ],
                className
            )}
        >
            {children}
        </div>
    );
};
