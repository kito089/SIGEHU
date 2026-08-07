CREATE PROCEDURE SP_LISTAR_CLIENTES (
    pSearch VARCHAR(200),
    pTipo VARCHAR(10),
    pConFiscales VARCHAR(10),
    pActivo VARCHAR(10),
    pPage INTEGER,
    pPageSize INTEGER
)
RETURNS (
    oIdCliente INTEGER,
    oNombreCompleto VARCHAR(100),
    oTelefonoPrincipal VARCHAR(15),
    oCorreoPrincipal VARCHAR(254),
    oRFC VARCHAR(13),
    oActivo BOOLEAN,
    oTieneDatosFiscales BOOLEAN,
    oTotalObrasActivas INTEGER,
    oTipo VARCHAR(10)
)
AS
DECLARE VARIABLE vOffset INTEGER;
BEGIN
    vOffset = (:pPage - 1) * :pPageSize;
    FOR
        SELECT
            c.idCliente,
            c.NombreCompleto,
            (SELECT FIRST 1 cc.Telefono FROM ContactosClientes cc WHERE cc.Clientes_idCliente = c.idCliente ORDER BY cc.idContactoCliente),
            (SELECT FIRST 1 cc.Correo FROM ContactosClientes cc WHERE cc.Clientes_idCliente = c.idCliente ORDER BY cc.idContactoCliente),
            c.RFC,
            c.Activo,
            CASE WHEN c.RFC IS NOT NULL THEN TRUE ELSE FALSE END,
            COUNT(o.idObra),
            c.Tipo
        FROM Clientes c
        LEFT JOIN Obras o ON o.Clientes_idCliente = c.idCliente AND o.Activo = TRUE AND o.EstadosObra_idEstadoObra < 7
        WHERE 1=1
          AND (:pSearch IS NULL OR :pSearch = '' OR c.NombreCompleto CONTAINING :pSearch)
          AND (:pTipo IS NULL OR :pTipo NOT IN ('persona','empresa') OR c.Tipo = :pTipo)
          AND (:pConFiscales <> 'with' OR c.RFC IS NOT NULL)
          AND (:pConFiscales <> 'without' OR c.RFC IS NULL)
          AND (:pActivo <> 'true' OR c.Activo = TRUE)
          AND (:pActivo <> 'false' OR c.Activo = FALSE)
        GROUP BY c.idCliente, c.NombreCompleto, c.RFC, c.Activo, c.Tipo
        ORDER BY c.NombreCompleto
        ROWS :pPageSize TO :vOffset + :pPageSize - 1
        INTO :oIdCliente, :oNombreCompleto, :oTelefonoPrincipal, :oCorreoPrincipal,
             :oRFC, :oActivo, :oTieneDatosFiscales, :oTotalObrasActivas, :oTipo
    DO
        SUSPEND;
END