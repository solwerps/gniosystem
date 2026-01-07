// src/components/templates/pdf/LoadingDocumentPDF.tsx

'use client';

import React from 'react';
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';

export const LoadingDocumentPDF = ({
  message = 'Cargando Datos ...',
}: {
  message?: string;
}) => {
  return (
    <Page
      key={1}
      size="LETTER"
      style={styles.page}
      orientation="portrait"
    >
      <View style={styles.emptyPageContainer}>
        <Text style={styles.emptyPageTitle}>Por favor espera</Text>
        <Text style={styles.emptyPageMessage}>{message}</Text>
        <Text style={styles.emptyPageInstructions}>
          Los datos serán cargados en un momento
        </Text>
      </View>
    </Page>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  emptyPageContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  emptyPageTitle: {
    fontSize: 20,
    color: '#333',
    marginBottom: 10,
  },
  emptyPageMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyPageInstructions: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
