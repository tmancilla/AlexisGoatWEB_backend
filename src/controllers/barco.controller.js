const barcoService = require('../services/barco.service');

function barcoPublico(barco) {
  return {
    barcoId: barco.id,
    partidaId: barco.jugadorPartida.partidaId,
    jugadorId: barco.jugadorPartida.usuarioId,
    tipo: barco.tipo,
    casilla: { x: barco.x, y: barco.y },
    casco: barco.cascoActual,
    cascoMaximo: barco.cascoMaximo,
    movimiento: barco.movimiento,
    alcance: barco.alcance,
    deteccion: barco.deteccion,
    aFlote: barco.aFlote};
}

async function listarBarcos(ctx) {
  const barcos = await barcoService.listarBarcos(ctx.params.id);

  ctx.status = 200;
  ctx.body = barcos.map(barcoPublico);
}

async function obtenerBarco(ctx) {
  const barco = await barcoService.obtenerBarco(ctx.params.id, ctx.params.barcoId);

  ctx.status = 200;
  ctx.body = barcoPublico(barco);
}

async function crearBarco(ctx) {
  const barco = await barcoService.crearBarco(ctx.params.id, ctx.request.body || {});

  ctx.status = 201;
  ctx.body = barcoPublico(barco);
}

async function actualizarBarco(ctx) {
  const barco = await barcoService.actualizarBarco(ctx.params.id, ctx.params.barcoId, ctx.request.body || {});

  ctx.status = 200;
  ctx.body = barcoPublico(barco);
}

async function eliminarBarco(ctx) {
  await barcoService.eliminarBarco(ctx.params.id, ctx.params.barcoId);

  ctx.status = 204;
}

module.exports = {
  listarBarcos,
  obtenerBarco,
  crearBarco,
  actualizarBarco,
  eliminarBarco,
};
