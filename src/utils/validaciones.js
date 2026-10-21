const HttpError = require('./HttpError');

function validarId(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new HttpError(400, 'ID_INVALIDO', 'El ID debe ser un entero positivo.');
  }
  return numero;
}

module.exports = {
  validarId,
};
