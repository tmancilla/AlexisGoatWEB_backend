const { ValidationError, UniqueConstraintError } = require('sequelize');

module.exports = async (ctx, next) => {
  try {
    await next();
    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404;
      ctx.body = { codigo: 'RUTA_NO_ENCONTRADA', mensaje: `No existe ${ctx.method} ${ctx.path}` };
    } else if (ctx.status === 405 && !ctx.body) {
      ctx.body = { codigo: 'METODO_NO_PERMITIDO', mensaje: `${ctx.method} no está permitido en ${ctx.path}` };
    }
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      ctx.status = 409;
      ctx.body = { codigo: 'REGISTRO_DUPLICADO', mensaje: err.errors.map((e) => e.message).join('; ') };
    } else if (err instanceof ValidationError) {
      ctx.status = 400;
      ctx.body = { codigo: 'VALIDACION_FALLIDA', mensaje: err.errors.map((e) => e.message).join('; ') };
    } else if (err.codigo) {
      ctx.status = err.status;
      ctx.body = { codigo: err.codigo, mensaje: err.message };
    } else if (err.status === 400) {
      ctx.status = 400;
      ctx.body = { codigo: 'JSON_MALFORMADO', mensaje: 'El cuerpo de la petición no es JSON válido' };
    } else {
      console.error(err);
      ctx.status = 500;
      ctx.body = { codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' };
    }
  }
};