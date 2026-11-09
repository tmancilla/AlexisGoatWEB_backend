class HttpError extends Error {
  constructor(status, codigo, mensaje, datos = {}) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.datos = datos;
  }
}

module.exports = HttpError;