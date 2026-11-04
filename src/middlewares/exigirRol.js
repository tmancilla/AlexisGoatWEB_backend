const HttpError = require('../utils/HttpError');

module.exports = (rol) => {
  return async (ctx, next) => {
    const usuario = ctx.state.user;

    if (!usuario || usuario.role !== rol) {
      throw new HttpError(
        403,
        'ROL_NO_AUTORIZADO',
        'No tienes permiso para acceder a este recurso.'
      );
    }

    await next();
  };
};