const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('Debes configurar JWT_SECRET en el archivo .env.');
}

function firmarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      rol: usuario.role,
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRA || '8h',
    }
  );
}

function verificarToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
  });
}

module.exports = {
  firmarToken,
  verificarToken,
};