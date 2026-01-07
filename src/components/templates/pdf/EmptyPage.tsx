// src/components/templates/pdf/EmptyPage.tsx
'use client';

import React from 'react';
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';

export const EmptyPage = ({ message }: { message: string }) => {
  return (
    <Page size="LETTER" style={styles.page} orientation="portrait" key={1}>
      <View style={styles.emptyPageContainer}>
        <Text style={styles.emptyPageTitle}>Ocurrió un problema</Text>
        <Text style={styles.emptyPageMessage}>{message}</Text>
        <Text style={styles.emptyPageInstructions}>
          Por favor, verifique los parámetros de búsqueda y vuelva a intentarlo.
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
