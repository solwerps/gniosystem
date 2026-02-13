import type { Prisma, PrismaClient } from "@prisma/client";
import { AccountingError } from "@/lib/accounting/context";

type TxLike = Prisma.TransactionClient | PrismaClient;

export const periodFromDate = (date: Date) => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
});

export async function assertPeriodOpen(
  tx: TxLike,
  empresaId: number,
  date: Date
) {
  const { year, month } = periodFromDate(date);

  const cierre = await tx.cierreMensual.findUnique({
    where: {
      ux_cierres_empresa_year_month: {
        empresa_id: empresaId,
        year,
        month,
      },
    },
    select: {
      is_closed: true,
      closed_at: true,
    },
  });

  if (cierre?.is_closed) {
    throw new AccountingError(
      "PERIOD_CLOSED",
      409,
      `El período ${year}-${String(month).padStart(2, "0")} está cerrado.`
    );
  }
}
