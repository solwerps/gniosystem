//src/components/templates/pdf/style.ts

import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 20,
    fontFamily: 'Helvetica',
  },
  header: {
    paddingVertical: 5,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerDiario: {
    paddingVertical: 5,
    marginBottom: 5,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: {
    paddingVertical: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  footer: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  title: { fontSize: 20 },
  textlg: { fontSize: 14 },
  textmd: { fontSize: 12 },
  textsm: { fontSize: 10 },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  italic: {
    fontFamily: 'Helvetica-BoldOblique',
  },
  red: { color: '#E73D1C' },
  blue: { color: '#064cff' },
  green: { color: '#4DAF6E' },
  gray: { color: '#525256' },
  contentEnd: {
    justifyContent: 'flex-end',
  },
  contentCenter: {
    justifyContent: 'center',
  },
  itemsEnd: {
    alignItems: 'flex-end',
  },
  itemsCenter: {
    alignItems: 'center',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  displayFlex: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexCenter: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  table: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    color: '#000',
    border: '1px solid #CCC',
  },
  tableHead: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    height: '23px',
    textAlign: 'center',
    backgroundColor: '#ccc',
  },
  tableBody: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  column: {
    fontSize: 6,
    marginVertical: 'auto',
  },
  columnCompras: {
    fontSize: 5,
    marginVertical: 'auto',
  },
  columnDiario: {
    fontSize: 10,
    marginVertical: 'auto',
  },
  rows: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    height: '23px',
    textAlign: 'center',
    borderBottom: '1px solid #DDDDDD',
  },
  row: {
    fontSize: 6,
    marginVertical: 'auto',
  },
  rowCompras: {
    fontSize: 5,
    marginVertical: 'auto',
  },
  rowVienenVan: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    height: '15px',
    textAlign: 'center',
    borderBottom: '1px solid #DDDDDD',
  },
  tableHeadVariant: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    height: '20px',
    backgroundColor: '#ccc',
    marginBottom: 5,
  },
  rowsVariant: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    height: 'auto',
    paddingBottom: 2,
  },
  rowVariant: {
    fontSize: 10,
  },
  totalColumnStyle: {
    width: '15%',
    borderTop: '1px dashed black',
    borderBottom: '1px solid black',
    paddingVertical: 5,
    textAlign: 'right',
  },
  right: {
    textAlign: 'right',
  },
  test: {
    backgroundColor: 'red',
  },
  capitalize: {
    textTransform: 'capitalize',
  },
});
