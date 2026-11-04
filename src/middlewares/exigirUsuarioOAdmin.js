const HttpError = require('../utils/HttpError');

module.exports = async (ctx, next) => {
  const usuario = ctx.state.user;
  const usuarioId = Number(ctx.params.id);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new HttpError(
      400,
      'ID_INVALIDO',
      'El ID debe ser un entero positivo.'
    );
  }

  if (usuario.role !== 'Administrador') {
    if (usuario.id !== usuarioId) {
      throw new HttpError(
        403,
        'USUARIO_NO_AUTORIZADO',
        'Solo puedes consultar o editar tu propio usuario.'
      );
    }

    const datos = ctx.request.body || {};

    if (ctx.method === 'PATCH' && datos.role !== undefined) {
      throw new HttpError(
        403,
        'CAMBIO_ROL_NO_AUTORIZADO',
        'Solo un administrador puede modificar el rol de un usuario.'
      );
    }
  }

  await next();
};