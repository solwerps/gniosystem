-- =============================================
-- GNIO Accounting PRO MVP
-- =============================================

-- 1) Configuración contable por empresa (vía Afiliaciones)
ALTER TABLE `Afiliaciones`
  ADD COLUMN `accountingMode` ENUM('CAJA', 'DEVENGO') NOT NULL DEFAULT 'DEVENGO';

-- 2) Extensiones de documentos (sin romper importador DTE)
ALTER TABLE `documentos`
  ADD COLUMN `condicion_pago` ENUM('CONTADO', 'CREDITO') NULL,
  ADD COLUMN `cuenta_bancaria_id` INTEGER NULL,
  ADD COLUMN `asiento_contable_id` INTEGER NULL,
  ADD COLUMN `cliente_id` INTEGER NULL,
  ADD COLUMN `proveedor_id` INTEGER NULL,
  ADD COLUMN `tercero_ref` JSON NULL;

-- 3) Extensiones de movimientos bancarios
ALTER TABLE `movimientos_cuentas_bancarias`
  ADD COLUMN `asiento_contable_id` INTEGER NULL,
  ADD COLUMN `documento_uuid` CHAR(36) NULL,
  ADD COLUMN `estado_conciliacion` ENUM('PENDIENTE', 'CONCILIADO') NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN `match_id` VARCHAR(191) NULL;

-- 4) Catálogos terceros (clientes / proveedores)
CREATE TABLE `clientes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `empresa_id` INTEGER NOT NULL,
  `nit` VARCHAR(191) NULL,
  `nombre` VARCHAR(191) NOT NULL,
  `estado` INTEGER NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `clientes_empresa_id_idx`(`empresa_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `proveedores` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `empresa_id` INTEGER NOT NULL,
  `nit` VARCHAR(191) NULL,
  `nombre` VARCHAR(191) NOT NULL,
  `estado` INTEGER NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `proveedores_empresa_id_idx`(`empresa_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5) Tesorería: cobros / pagos
CREATE TABLE `cobros` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `empresa_id` INTEGER NOT NULL,
  `cuenta_bancaria_id` INTEGER NULL,
  `cliente_id` INTEGER NULL,
  `fecha` DATE NOT NULL,
  `monto` DECIMAL(20, 2) NOT NULL,
  `referencia` VARCHAR(191) NULL,
  `estado` INTEGER NOT NULL DEFAULT 1,
  `asiento_contable_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `cobros_empresa_id_idx`(`empresa_id`),
  INDEX `cobros_cuenta_bancaria_id_idx`(`cuenta_bancaria_id`),
  INDEX `cobros_cliente_id_idx`(`cliente_id`),
  INDEX `cobros_asiento_contable_id_idx`(`asiento_contable_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `pagos` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `empresa_id` INTEGER NOT NULL,
  `cuenta_bancaria_id` INTEGER NULL,
  `proveedor_id` INTEGER NULL,
  `fecha` DATE NOT NULL,
  `monto` DECIMAL(20, 2) NOT NULL,
  `referencia` VARCHAR(191) NULL,
  `estado` INTEGER NOT NULL DEFAULT 1,
  `asiento_contable_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `pagos_empresa_id_idx`(`empresa_id`),
  INDEX `pagos_cuenta_bancaria_id_idx`(`cuenta_bancaria_id`),
  INDEX `pagos_proveedor_id_idx`(`proveedor_id`),
  INDEX `pagos_asiento_contable_id_idx`(`asiento_contable_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `aplicacion_pagos_documentos` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pago_id` INTEGER NULL,
  `cobro_id` INTEGER NULL,
  `documento_uuid` CHAR(36) NOT NULL,
  `monto_aplicado` DECIMAL(20, 2) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `aplicacion_pagos_documentos_pago_id_idx`(`pago_id`),
  INDEX `aplicacion_pagos_documentos_cobro_id_idx`(`cobro_id`),
  INDEX `aplicacion_pagos_documentos_documento_uuid_idx`(`documento_uuid`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6) Cierre mensual
CREATE TABLE `cierres_mensuales` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `empresa_id` INTEGER NOT NULL,
  `year` INTEGER NOT NULL,
  `month` INTEGER NOT NULL,
  `is_closed` BOOLEAN NOT NULL DEFAULT false,
  `closed_at` DATETIME(3) NULL,
  `closed_by` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ux_cierres_empresa_year_month`(`empresa_id`, `year`, `month`),
  INDEX `cierres_mensuales_empresa_id_idx`(`empresa_id`),
  INDEX `cierres_mensuales_closed_by_idx`(`closed_by`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 7) Índices nuevos en tablas existentes
CREATE INDEX `cuenta_bancaria_idx` ON `documentos`(`cuenta_bancaria_id`);
CREATE INDEX `asiento_contable_idx` ON `documentos`(`asiento_contable_id`);
CREATE INDEX `cliente_idx` ON `documentos`(`cliente_id`);
CREATE INDEX `proveedor_idx` ON `documentos`(`proveedor_id`);

CREATE INDEX `movimientos_cuentas_bancarias_asiento_contable_id_idx`
  ON `movimientos_cuentas_bancarias`(`asiento_contable_id`);
CREATE INDEX `movimientos_cuentas_bancarias_documento_uuid_idx`
  ON `movimientos_cuentas_bancarias`(`documento_uuid`);
CREATE INDEX `movimientos_cuentas_bancarias_estado_conciliacion_idx`
  ON `movimientos_cuentas_bancarias`(`estado_conciliacion`);

-- 8) FKs en tablas nuevas
ALTER TABLE `clientes`
  ADD CONSTRAINT `clientes_empresa_id_fkey`
  FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `proveedores`
  ADD CONSTRAINT `proveedores_empresa_id_fkey`
  FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cobros`
  ADD CONSTRAINT `cobros_empresa_id_fkey`
  FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `cobros_cuenta_bancaria_id_fkey`
  FOREIGN KEY (`cuenta_bancaria_id`) REFERENCES `CuentaBancaria`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cobros_cliente_id_fkey`
  FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cobros_asiento_contable_id_fkey`
  FOREIGN KEY (`asiento_contable_id`) REFERENCES `asientos_contables`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pagos`
  ADD CONSTRAINT `pagos_empresa_id_fkey`
  FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `pagos_cuenta_bancaria_id_fkey`
  FOREIGN KEY (`cuenta_bancaria_id`) REFERENCES `CuentaBancaria`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `pagos_proveedor_id_fkey`
  FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `pagos_asiento_contable_id_fkey`
  FOREIGN KEY (`asiento_contable_id`) REFERENCES `asientos_contables`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `aplicacion_pagos_documentos`
  ADD CONSTRAINT `aplicacion_pagos_documentos_pago_id_fkey`
  FOREIGN KEY (`pago_id`) REFERENCES `pagos`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `aplicacion_pagos_documentos_cobro_id_fkey`
  FOREIGN KEY (`cobro_id`) REFERENCES `cobros`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `aplicacion_pagos_documentos_documento_uuid_fkey`
  FOREIGN KEY (`documento_uuid`) REFERENCES `documentos`(`uuid`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cierres_mensuales`
  ADD CONSTRAINT `cierres_mensuales_empresa_id_fkey`
  FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `cierres_mensuales_closed_by_fkey`
  FOREIGN KEY (`closed_by`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 9) FKs en tablas existentes
ALTER TABLE `documentos`
  ADD CONSTRAINT `documentos_cuenta_bancaria_id_fkey`
  FOREIGN KEY (`cuenta_bancaria_id`) REFERENCES `CuentaBancaria`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `documentos_asiento_contable_id_fkey`
  FOREIGN KEY (`asiento_contable_id`) REFERENCES `asientos_contables`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `documentos_cliente_id_fkey`
  FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `documentos_proveedor_id_fkey`
  FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `movimientos_cuentas_bancarias`
  ADD CONSTRAINT `movimientos_cuentas_bancarias_asiento_contable_id_fkey`
  FOREIGN KEY (`asiento_contable_id`) REFERENCES `asientos_contables`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `movimientos_cuentas_bancarias_documento_uuid_fkey`
  FOREIGN KEY (`documento_uuid`) REFERENCES `documentos`(`uuid`)
  ON DELETE SET NULL ON UPDATE CASCADE;
