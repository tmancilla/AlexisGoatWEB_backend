const { Usuario } = require('../models');
const HttpError = require('../utils/HttpError');

module.exports = async (ctx, next) => {
  const encabezado = ctx.get('X-Usuario-Id');
  const usuarioId = Number(encabezado);

  if (!encabezado || !Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new HttpError(
      401,
      'USUARIO_NO_IDENTIFICADO',
      'Debes enviar el header X-Usuario-Id con el id del usuario.'
    );
  }

  const usuario = await Usuario.findByPk(usuarioId);

  if (!usuario) {
    throw new HttpError(
      401,
      'USUARIO_NO_IDENTIFICADO',
      'El usuario indicado en X-Usuario-Id no existe.'
    );
  }

  ctx.state.usuario = usuario;
  await next();
};