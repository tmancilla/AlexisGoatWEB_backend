const casillaService = require('../services/casilla.service');

function casillaPublica(casilla) {
  return {
    casillaId: casilla.id,
    partidaId: casilla.partidaId,
    x: casilla.x,
    y: casilla.y,
    tipo: casilla.tipo,
    agotada: casilla.agotada};
}

async function listarCasillas(ctx) {
  const casillas = await casillaService.listarCasillas(ctx.params.id);

  ctx.status = 200;
  ctx.body = casillas.map(casillaPublica);
}

async function obtenerCasilla(ctx) {
  const casilla = await casillaService.obtenerCasilla(ctx.params.id, ctx.params.casillaId);

  ctx.status = 200;
  ctx.body = casillaPublica(casilla);
}

async function crearCasilla(ctx) {
  const casilla = await casillaService.crearCasilla(ctx.params.id, ctx.request.body || {});

  ctx.status = 201;
  ctx.body = casillaPublica(casilla);
}

async function actualizarCasilla(ctx) {
  const casilla = await casillaService.actualizarCasilla(ctx.params.id, ctx.params.casillaId, ctx.request.body || {});

  ctx.status = 200;
  ctx.body = casillaPublica(casilla);
}

async function eliminarCasilla(ctx) {
  await casillaService.eliminarCasilla(ctx.params.id, ctx.params.casillaId);

  ctx.status = 204;
}

module.exports = {
  listarCasillas,
  obtenerCasilla,
  crearCasilla,
  actualizarCasilla,
  eliminarCasilla,
};
