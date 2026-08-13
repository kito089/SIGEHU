-- =============================================================================
-- MIGRACIÓN: Fechas por etapa en Obras
-- -----------------------------------------------------------------------------
-- 1. Añade FechaLevantamiento  (fecha programada del levantamiento).
-- 2. Añade FechaFabricacion    (fecha en la que se inicia la fabricación).
-- 3. Añade FechaInstalacion    (fecha programada de instalación).
--
-- Idempotente: el runner (src/scripts/apply-obra-fechas-etapas-migration.js)
-- verifica cada columna contra RDB$RELATION_FIELDS antes de crearla. La lectura
-- se hace fusionando estas columnas en getDetalleObra (sin alterar la vista) y
-- la escritura vía PATCH /Obras/:id/fechas-etapas (solo Propietario).
-- =============================================================================

-- 1) Columna FechaLevantamiento en Obras (verificada contra RDB$RELATION_FIELDS)
-- ALTER TABLE Obras ADD FechaLevantamiento TIMESTAMP;

-- 2) Columna FechaFabricacion en Obras (verificada contra RDB$RELATION_FIELDS)
-- ALTER TABLE Obras ADD FechaFabricacion TIMESTAMP;

-- 3) Columna FechaInstalacion en Obras (verificada contra RDB$RELATION_FIELDS)
-- ALTER TABLE Obras ADD FechaInstalacion TIMESTAMP;