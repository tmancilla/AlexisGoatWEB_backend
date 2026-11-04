const { firmarToken } = require('../../src/utils/token');

function tokenDe(usuario) {
  return firmarToken(usuario);
}

module.exports = tokenDe;