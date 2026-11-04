const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.DOTENV_QUIET = 'true';

require('dotenv').config();

process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.CODIGO_ADMIN = 'codigo-admin-test';

const configuracion = require('../src/config/database');

if (
  typeof configuracion.test.database !== 'string' ||
  !configuracion.test.database.endsWith('_test') ||
  configuracion.test.database === configuracion.development.database
) {
  throw new Error(
    'Las pruebas deben utilizar una base distinta de desarrollo y terminada en _test.'
  );
}