// src/components/molecules/path.tsx
'use client';

import React from 'react';
import Link from 'next/link';

// 🧱 Atoms GNIO (import individual, pero desde el barrel de atoms)
import { Text } from '@/components/atoms';

interface PathItem {
  text: string;
  href?: string;
}

interface PathProps {
  parent?: PathItem;                  // 👈 ahora es opcional
  hijos?: PathItem[];
}

export const Path: React.FC<PathProps> = ({ parent, hijos }) => {
  // Si no hay nada que mostrar, no renderizamos nada
  if (!parent && (!hijos || hijos.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-row items-center mb-5">
      {/* Parent (si viene) */}
      {parent && (
        <Text variant="title" bold>
          {parent.text}
        </Text>
      )}

      {/* Separador si hay hijos */}
      {parent && hijos && hijos.length > 0 && (
        <Text variant="title" className="mx-2">
          /
        </Text>
      )}

      {/* Hijos */}
      {hijos &&
        hijos.map((hijo, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <Text variant="title" className="mx-2">
                /
              </Text>
            )}
            {hijo.href ? (
              <Link href={hijo.href}>
                <Text variant="title">{hijo.text}</Text>
              </Link>
            ) : (
              <Text variant="title">{hijo.text}</Text>
            )}
          </React.Fragment>
        ))}
    </div>
  );
};
