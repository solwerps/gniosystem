'use client';

import clsx from 'clsx';
import React, { ReactNode } from 'react';

interface Props {
    icon: ReactNode;
    title: string;
    action: any;
}

export const NavButton: React.FC<Props> = ({ icon, title, action }) => {
    return (
        <li
            className={clsx(
                'flex items-center p-2 text-base font-normal rounded-lg text-white hover:bg-gray-700 group cursor-pointer'
            )}
            onClick={action}
        >
            {icon}
            <span className="ml-3">{title}</span>
        </li>
    );
};
