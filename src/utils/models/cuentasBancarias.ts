export interface IGetCuentaBancaria {
  id: number;
  numero_cuenta: string;
  nombre_banco: string;
  descripcion: string;
  moneda: string;
  saldo: string;                 // saldoInicial (Decimal) -> lo puedes manejar como string
  empresa_id: number;
  estado: number;
  cuenta_contable_descripcion: string;
  cuenta_contable_id: number | null; // Prisma: cuentaContableId Int?
}

export interface ICuentaBancariaForm {
  numero_cuenta: string;
  nombre_banco: string;
  descripcion: string;
  moneda: string;
  saldo: string;                 // Decimal -> string en el form está bien
  nit: number;
  cuenta_contable_id: number | null; // Int? en Prisma
}

export interface IMovimientoBancario {
  id:                 number;
  cuenta_bancaria_id: number;          // Int en Prisma
  fecha:              Date;            // DateTime @db.Date
  descripcion:        string;
  tipo_movimiento:    "debito" | "credito"; // enum TipoMovimientoBancario
  monto:              string;          // Decimal -> lo sigues manejando como string
  referencia:         string;
  estado:             number;
}
