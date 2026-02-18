/*
  Warnings:

  - Added the required column `estado` to the `Empresa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Empresa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Empresa` ADD COLUMN `estado` INTEGER NOT NULL,
    ADD COLUMN `tenantId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `establecimientos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `numero_de_establecimiento` VARCHAR(191) NOT NULL,
    `direccion_comercial` VARCHAR(191) NULL,
    `fecha_de_inicio_de_operaciones` DATE NULL,
    `tipo_de_establecimiento` VARCHAR(191) NULL,
    `clasificacion_por_establecimiento` VARCHAR(191) NULL,
    `actividad_economica` VARCHAR(191) NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,
    `empresa_id` INTEGER NOT NULL,

    INDEX `establecimientos_empresa_id_idx`(`empresa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_cuentas_bancarias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cuenta_bancaria_id` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `tipo_movimiento` ENUM('debito', 'credito') NOT NULL,
    `monto` DECIMAL(15, 2) NOT NULL,
    `referencia` VARCHAR(191) NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,

    INDEX `movimientos_cuentas_bancarias_cuenta_bancaria_id_idx`(`cuenta_bancaria_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos` (
    `uuid` CHAR(36) NOT NULL,
    `numero_autorizacion` VARCHAR(191) NOT NULL,
    `fecha_trabajo` DATE NOT NULL,
    `fecha_emision` DATE NOT NULL,
    `tipo_dte` VARCHAR(191) NOT NULL,
    `serie` VARCHAR(191) NOT NULL,
    `numero_dte` VARCHAR(191) NOT NULL,
    `identificador_unico` VARCHAR(191) NOT NULL,
    `nit_emisor` VARCHAR(191) NOT NULL,
    `nombre_emisor` VARCHAR(191) NOT NULL,
    `codigo_establecimiento` VARCHAR(191) NOT NULL,
    `establecimiento_receptor_id` INTEGER NULL,
    `nombre_establecimiento` VARCHAR(191) NOT NULL,
    `id_receptor` VARCHAR(191) NOT NULL,
    `nombre_receptor` VARCHAR(191) NOT NULL,
    `nit_certificador` VARCHAR(191) NOT NULL,
    `nombre_certificador` VARCHAR(191) NOT NULL,
    `moneda` VARCHAR(191) NOT NULL,
    `monto_total` DECIMAL(20, 2) NOT NULL,
    `monto_servicio` DECIMAL(20, 2) NULL,
    `monto_bien` DECIMAL(20, 2) NULL,
    `factura_estado` VARCHAR(191) NOT NULL,
    `marca_anulado` VARCHAR(191) NOT NULL,
    `fecha_anulacion` DATE NULL,
    `iva` DECIMAL(10, 2) NOT NULL,
    `petroleo` DECIMAL(10, 2) NOT NULL,
    `turismo_hospedaje` DECIMAL(10, 2) NOT NULL,
    `turismo_pasajes` DECIMAL(10, 2) NOT NULL,
    `timbre_prensa` DECIMAL(10, 2) NOT NULL,
    `bomberos` DECIMAL(10, 2) NOT NULL,
    `tasa_municipal` DECIMAL(10, 2) NOT NULL,
    `bebidas_alcoholicas` DECIMAL(10, 2) NOT NULL,
    `tabaco` DECIMAL(10, 2) NOT NULL,
    `cemento` DECIMAL(10, 2) NOT NULL,
    `bebidas_no_alcoholicas` DECIMAL(10, 2) NOT NULL,
    `tarifa_portuaria` DECIMAL(10, 2) NOT NULL,
    `tipo_operacion` VARCHAR(191) NOT NULL,
    `cuenta_debe` INTEGER NULL,
    `cuenta_haber` INTEGER NULL,
    `tipo` VARCHAR(191) NULL,
    `empresa_id` INTEGER NOT NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,
    `comentario` VARCHAR(191) NULL,

    UNIQUE INDEX `documentos_identificador_unico_key`(`identificador_unico`),
    INDEX `empresa_id_idx`(`empresa_id`),
    INDEX `numero_dte_idx`(`numero_dte`),
    INDEX `establecimiento_receptor_idx`(`establecimiento_receptor_id`),
    INDEX `cuenta_debe_idx`(`cuenta_debe`),
    INDEX `cuenta_haber_idx`(`cuenta_haber`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `retenciones_iva` (
    `uuid` CHAR(36) NOT NULL,
    `empresa_id` INTEGER NOT NULL,
    `fecha_trabajo` DATE NOT NULL,
    `nit_retenedor` VARCHAR(191) NOT NULL,
    `nombre_retenedor` VARCHAR(191) NOT NULL,
    `estado_constancia` VARCHAR(191) NOT NULL,
    `constancia` VARCHAR(191) NOT NULL,
    `fecha_emision` DATE NOT NULL,
    `total_factura` DECIMAL(10, 2) NOT NULL,
    `importe_neto` DECIMAL(10, 2) NOT NULL,
    `afecto_retencion` DECIMAL(10, 2) NOT NULL,
    `total_retencion` DECIMAL(10, 2) NOT NULL,

    INDEX `retenciones_iva_empresa_id_idx`(`empresa_id`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `retenciones_isr` (
    `uuid` CHAR(36) NOT NULL,
    `empresa_id` INTEGER NOT NULL,
    `fecha_trabajo` DATE NOT NULL,
    `nit_retenedor` VARCHAR(191) NOT NULL,
    `nombre_retenedor` VARCHAR(191) NOT NULL,
    `estado_constancia` VARCHAR(191) NOT NULL,
    `constancia` VARCHAR(191) NOT NULL,
    `fecha_emision` DATE NOT NULL,
    `total_factura` DECIMAL(10, 2) NOT NULL,
    `renta_imponible` DECIMAL(10, 2) NOT NULL,
    `total_retencion` DECIMAL(10, 2) NOT NULL,

    INDEX `retenciones_isr_empresa_id_idx`(`empresa_id`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `formulario_isr_opcional_mensual` (
    `uuid` CHAR(36) NOT NULL,
    `monto_bienes` DECIMAL(20, 2) NULL,
    `monto_servicios` DECIMAL(20, 2) NULL,
    `monto_descuentos` DECIMAL(20, 2) NULL,
    `iva` DECIMAL(20, 2) NULL,
    `monto_base` DECIMAL(20, 2) NULL,
    `facturas_emitidas` INTEGER NULL,
    `retenciones_isr` INTEGER NULL,
    `monto_isr_porcentaje_5` DECIMAL(20, 2) NULL,
    `monto_isr_porcentaje_7` DECIMAL(20, 2) NULL,
    `isr` DECIMAL(20, 2) NULL,
    `isr_retenido` DECIMAL(20, 2) NULL,
    `isr_x_pagar` DECIMAL(20, 2) NULL,
    `empresa_id` INTEGER NULL,
    `fecha_trabajo` DATE NOT NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,

    INDEX `formulario_isr_opcional_mensual_empresa_id_idx`(`empresa_id`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iva_general_mensual` (
    `uuid` CHAR(36) NOT NULL,
    `debito_total` DECIMAL(20, 2) NULL,
    `remanente_credito` DECIMAL(20, 2) NULL,
    `credito_total` DECIMAL(20, 2) NULL,
    `credito_periodo_siguiente` DECIMAL(20, 2) NULL,
    `remanente_retenciones` DECIMAL(20, 2) NULL,
    `retenciones_recibidas` DECIMAL(20, 2) NULL,
    `retenciones_periodo_siguiente` DECIMAL(20, 2) NULL,
    `impuesto_a_pagar` DECIMAL(20, 2) NULL,
    `empresa_id` INTEGER NULL,
    `fecha_trabajo` DATE NOT NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,

    INDEX `iva_general_mensual_empresa_id_idx`(`empresa_id`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipos_polizas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asientos_contables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `correlativo` INTEGER NOT NULL,
    `tipo_poliza_id` INTEGER NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `referencia` VARCHAR(191) NULL,
    `fecha` DATE NOT NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,
    `empresa_id` INTEGER NOT NULL,

    INDEX `asientos_contables_empresa_id_idx`(`empresa_id`),
    INDEX `asientos_contables_tipo_poliza_id_idx`(`tipo_poliza_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partidas` (
    `uuid` CHAR(36) NOT NULL,
    `monto_debe` DECIMAL(20, 2) NOT NULL,
    `monto_haber` DECIMAL(20, 2) NOT NULL,
    `referencia` VARCHAR(191) NULL,
    `cuenta_id` INTEGER NOT NULL,
    `empresa_id` INTEGER NULL,
    `asiento_contable_id` INTEGER NOT NULL,

    INDEX `partidas_empresa_id_idx`(`empresa_id`),
    INDEX `partidas_cuenta_id_idx`(`cuenta_id`),
    INDEX `partidas_asiento_contable_id_idx`(`asiento_contable_id`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bitacora` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `tipo_accion` VARCHAR(191) NOT NULL,
    `descripcion_accion` TEXT NULL,
    `tabla_afectada` VARCHAR(191) NULL,
    `registro_afectado_id` INTEGER NULL,
    `detalles_modificacion` TEXT NULL,
    `fecha_accion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bitacora_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `libros_contables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_libro` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresa_id` INTEGER NOT NULL,
    `libro_contable_id` INTEGER NOT NULL,
    `folios_disponibles` INTEGER NOT NULL DEFAULT 0,
    `contador_folios` INTEGER NOT NULL DEFAULT 0,
    `fecha_habilitacion` DATE NOT NULL,

    INDEX `folios_empresa_id_idx`(`empresa_id`),
    INDEX `folios_libro_contable_id_idx`(`libro_contable_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Empresa_tenantId_idx` ON `Empresa`(`tenantId`);

-- AddForeignKey
ALTER TABLE `Empresa` ADD CONSTRAINT `Empresa_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `establecimientos` ADD CONSTRAINT `establecimientos_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_cuentas_bancarias` ADD CONSTRAINT `movimientos_cuentas_bancarias_cuenta_bancaria_id_fkey` FOREIGN KEY (`cuenta_bancaria_id`) REFERENCES `CuentaBancaria`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_establecimiento_receptor_id_fkey` FOREIGN KEY (`establecimiento_receptor_id`) REFERENCES `establecimientos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_cuenta_debe_fkey` FOREIGN KEY (`cuenta_debe`) REFERENCES `NomenclaturaCuenta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_cuenta_haber_fkey` FOREIGN KEY (`cuenta_haber`) REFERENCES `NomenclaturaCuenta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retenciones_iva` ADD CONSTRAINT `retenciones_iva_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retenciones_isr` ADD CONSTRAINT `retenciones_isr_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `formulario_isr_opcional_mensual` ADD CONSTRAINT `formulario_isr_opcional_mensual_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iva_general_mensual` ADD CONSTRAINT `iva_general_mensual_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asientos_contables` ADD CONSTRAINT `asientos_contables_tipo_poliza_id_fkey` FOREIGN KEY (`tipo_poliza_id`) REFERENCES `tipos_polizas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asientos_contables` ADD CONSTRAINT `asientos_contables_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidas` ADD CONSTRAINT `partidas_cuenta_id_fkey` FOREIGN KEY (`cuenta_id`) REFERENCES `NomenclaturaCuenta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidas` ADD CONSTRAINT `partidas_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidas` ADD CONSTRAINT `partidas_asiento_contable_id_fkey` FOREIGN KEY (`asiento_contable_id`) REFERENCES `asientos_contables`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bitacora` ADD CONSTRAINT `bitacora_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `folios` ADD CONSTRAINT `folios_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `folios` ADD CONSTRAINT `folios_libro_contable_id_fkey` FOREIGN KEY (`libro_contable_id`) REFERENCES `libros_contables`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
