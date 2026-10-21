const accionService = require('../services/accion.service');

async function realizarAccion(ctx) {
  const resultado = await accionService.realizarAccion(ctx.params.id, ctx.state.usuario, ctx.request.body || {});

  ctx.status = 200;
  ctx.body = resultado;
}

module.exports = {
  realizarAccion,
};
