const partidaService = require('../services/partida.service');

function jugadoresDe(partida) {
  return partida.jugadores.map((jugador) => ({
    id: jugador.id,
    username: jugador.username,
    rolPartida: jugador.JugadorPartida.rolPartida,
    numeroJugador: jugador.JugadorPartida.numeroJugador,
  }));
}

function resumenPartida(partida) {
  return {
    partidaId: partida.id,
    estado: partida.estado,
    modo: partida.modo,
    rondaActual: partida.rondaActual,
    maxRondas: partida.maxRondas,
    expiraEn: partida.expiraEn,
    jugadores: jugadoresDe(partida),
    createdAt: partida.createdAt,
  };
}

function detallePartida(partida) {
  return {
    ...resumenPartida(partida),
    codigoInvitacion: partida.codigoInvitacion,
  };
}

async function listarPartidas(ctx) {
  const partidas = await partidaService.listarPartidas(ctx.query);

  ctx.status = 200;
  ctx.body = partidas.map(resumenPartida);
}

async function obtenerPartida(ctx) {
  const partida = await partidaService.obtenerPartida(ctx.params.id, ctx.state.usuario);

  ctx.status = 200;
  ctx.body = detallePartida(partida);
}

async function crearPartida(ctx) {
  const usuario = ctx.state.usuario;
  const partida = await partidaService.crearPartida(usuario);

  ctx.status = 201;
  ctx.body = {
    partidaId: partida.id,
    codigoInvitacion: partida.codigoInvitacion,
    estado: partida.estado,
    dueno: { id: usuario.id, username: usuario.username },
    expiraEn: partida.expiraEn,
  };
}

async function unirsePorCodigo(ctx) {
  const partida = await partidaService.unirsePorCodigo(ctx.params.codigo, ctx.state.usuario);

  ctx.status = 200;
  ctx.body = {
    partidaId: partida.id,
    estado: partida.estado,
    jugadores: jugadoresDe(partida),
  };
}

async function buscarRival(ctx) {
  const usuario = ctx.state.usuario;
  const resultado = await partidaService.buscarRival(usuario);

  if (!resultado.encontrado) {
    ctx.status = 202;
    ctx.body = {
      estado: 'BUSCANDO',
      partidaId: resultado.partidaId,
      posicionEnCola: resultado.posicionEnCola,
    };
    return;
  }

  const oponente = resultado.partida.jugadores.find((jugador) => jugador.id !== usuario.id);

  ctx.status = 200;
  ctx.body = {
    partidaId: resultado.partida.id,
    estado: resultado.partida.estado,
    oponente: { id: oponente.id, username: oponente.username },
  };
}

async function actualizarPartida(ctx) {
  const datos = ctx.request.body || {};
  const partida = await partidaService.actualizarPartida(ctx.params.id, datos, ctx.state.usuario);

  ctx.status = 200;
  ctx.body = detallePartida(partida);
}

async function cancelarPartida(ctx) {
  await partidaService.cancelarPartida(ctx.params.id, ctx.state.usuario);

  ctx.status = 204;
}

module.exports = {
  listarPartidas,
  obtenerPartida,
  crearPartida,
  unirsePorCodigo,
  buscarRival,
  actualizarPartida,
  cancelarPartida,
};