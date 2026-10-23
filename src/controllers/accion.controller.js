const accionService = require('../services/accion.service');

async function realizarAccion(ctx) {
  const resultado = await accionService.realizarAccion(ctx.params.id, ctx.state.usuario, ctx.request.body || {});

  ctx.status = 200;
  ctx.body = resultado;
}

async function listarAcciones(ctx) {
  ctx.status = 200;
  ctx.body = await accionService.listarAcciones(ctx.params.id, ctx.state.usuario);
}

async function obtenerAccion(ctx) {
  ctx.status = 200;
  ctx.body = await accionService.obtenerAccion(ctx.params.id, ctx.params.accionId, ctx.state.usuario);
}

async function actualizarAccion(ctx) {
  const accion = await accionService.actualizarAccion(
    ctx.params.id,
    ctx.params.accionId,
    ctx.state.usuario,
    ctx.request.body || {}
  );

  ctx.status = 200;
  ctx.body = accion;
}

async function eliminarAccion(ctx) {
  await accionService.eliminarAccion(ctx.params.id, ctx.params.accionId, ctx.state.usuario);
  ctx.status = 204;
}

module.exports = {
  realizarAccion,
  listarAcciones,
  obtenerAccion,
  actualizarAccion,
  eliminarAccion,
};