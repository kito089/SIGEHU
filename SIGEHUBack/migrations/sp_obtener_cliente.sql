CREATE PROCEDURE SP_OBTENER_CLIENTE (pIdCliente INTEGER)
RETURNS (
    oIdCliente INTEGER,
    oNombreCompleto VARCHAR(100),
    oDireccion BLOB SUB_TYPE TEXT,
    oRFC VARCHAR(13),
    oRegimenFiscalId INTEGER,
    oCodigoPostal VARCHAR(5),
    oUsoCFDIId INTEGER,
    oObservaciones BLOB SUB_TYPE TEXT,
    oActivo BOOLEAN,
    oTipo VARCHAR(10)
)
AS
BEGIN
    SELECT
        idCliente, NombreCompleto, Direccion, RFC,
        RegimenesFiscales_idRegimenFiscal, CodigoPostal, UsosCFDI_idUsoCFDI,
        Observaciones, Activo, Tipo
    FROM Clientes WHERE idCliente = :pIdCliente
    INTO :oIdCliente, :oNombreCompleto, :oDireccion, :oRFC,
         :oRegimenFiscalId, :oCodigoPostal, :oUsoCFDIId,
         :oObservaciones, :oActivo, :oTipo;
    SUSPEND;
END