const eventoService = require('../services/evento.service');

function eventoPublico(evento) {
  return {
    eventoId: evento.id,
    partidaId: evento.partidaId,
    ronda: evento.ronda,
    carta: evento.tipoCarta,
    efecto: evento.descripcion,
    createdAt: evento.createdAt,
  };
}

async function listarEventos(ctx) {
  const eventos = await eventoService.listarEventos(ctx.params.id, ctx.state.usuario);

  ctx.status = 200;
  ctx.body = eventos.map(eventoPublico);
}

async function obtenerEvento(ctx) {
  const evento = await eventoService.obtenerEvento(ctx.params.id, ctx.params.eventoId, ctx.state.usuario);

  ctx.status = 200;
  ctx.body = eventoPublico(evento);
}

async function crearEvento(ctx) {
  const evento = await eventoService.crearEvento(ctx.params.id, ctx.state.usuario, ctx.request.body || {});

  ctx.status = 201;
  ctx.body = eventoPublico(evento);
}

async function actualizarEvento(ctx) {
  const evento = await eventoService.actualizarEvento(
    ctx.params.id,
    ctx.params.eventoId,
    ctx.state.usuario,
    ctx.request.body || {}
  );

  ctx.status = 200;
  ctx.body = eventoPublico(evento);
}

async function eliminarEvento(ctx) {
  await eventoService.eliminarEvento(ctx.params.id, ctx.params.eventoId, ctx.state.usuario);

  ctx.status = 204;
}

module.exports = {
  listarEventos,
  obtenerEvento,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
};
