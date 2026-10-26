const combateService = require('../services/combate.service');

function combatePublico(combate) {
  return {
    combateId: combate.id,
    partidaId: combate.atacante.jugadorPartida.partidaId,
    ronda: combate.ronda,
    tipo: combate.tipo,
    atacante: { barcoId: combate.atacante.id, tipo: combate.atacante.tipo, jugadorId: combate.atacante.jugadorPartida.usuarioId },
    defensor: { barcoId: combate.defensor.id, tipo: combate.defensor.tipo, jugadorId: combate.defensor.jugadorPartida.usuarioId },
    dadoAtacante: combate.dadoAtacante,
    dadoDefensor: combate.dadoDefensor,
    impacto: combate.impacto,
    createdAt: combate.createdAt};
}

async function listarCombates(ctx) {
  const combates = await combateService.listarCombates(ctx.params.id, ctx.state.usuario);

  ctx.status = 200;
  ctx.body = combates.map(combatePublico);
}

async function obtenerCombate(ctx) {
  const combate = await combateService.obtenerCombate(ctx.params.id, ctx.params.combateId, ctx.state.usuario);

  ctx.status = 200;
  ctx.body = combatePublico(combate);
}

async function crearCombate(ctx) {
  const combate = await combateService.crearCombate(ctx.params.id, ctx.state.usuario, ctx.request.body || {});

  ctx.status = 201;
  ctx.body = combatePublico(combate);
}

async function actualizarCombate(ctx) {
  const combate = await combateService.actualizarCombate(
    ctx.params.id,
    ctx.params.combateId,
    ctx.state.usuario,
    ctx.request.body || {});

  ctx.status = 200;
  ctx.body = combatePublico(combate);
}

async function eliminarCombate(ctx) {
  await combateService.eliminarCombate(ctx.params.id, ctx.params.combateId, ctx.state.usuario);

  ctx.status = 204;
}

module.exports = {
  listarCombates,
  obtenerCombate,
  crearCombate,
  actualizarCombate,
  eliminarCombate,
};
