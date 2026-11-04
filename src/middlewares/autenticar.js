const koaJwt = require('koa-jwt');
const { Usuario } = require('../models');
const HttpError = require('../utils/HttpError');

const validarToken = koaJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
  key: 'token',
});

module.exports = async (ctx, next) => {
  try {
    await validarToken(ctx, async () => {});
  } catch (error) {
    if (error.status === 401) {
      throw new HttpError(
        401,
        'TOKEN_INVALIDO',
        'Debes iniciar sesión con un token válido.'
      );
    }

    throw error;
  }

  const datosToken = ctx.state.token;

  if (!datosToken || !Number.isInteger(datosToken.id) || datosToken.id <= 0) {
    throw new HttpError(
      401,
      'TOKEN_INVALIDO',
      'El token no identifica a un usuario válido.'
    );
  }

  const usuario = await Usuario.findByPk(datosToken.id, {
    attributes: { exclude: ['password'] },
  });

  if (!usuario) {
    throw new HttpError(
      401,
      'TOKEN_INVALIDO',
      'El usuario del token ya no existe.'
    );
  }

  ctx.state.user = usuario;
  ctx.state.usuario = usuario;

  await next();
};