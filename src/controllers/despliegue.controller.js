const despliegueService = require('../services/despliegue.service');

async function desplegar(ctx) {
  const resultado = await despliegueService.desplegar(ctx.params.id, ctx.state.usuario, ctx.request.body || {});

  ctx.status = 200;
  ctx.body = resultado;
}

module.exports = {
  desplegar,
};
