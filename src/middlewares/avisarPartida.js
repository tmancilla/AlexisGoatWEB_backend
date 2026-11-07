const { avisarCambio, socketActivo, usuariosDePartida } = require('../realtime/socket');

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = (motivo, { lobby = false } = {}) => async (ctx, next) => {
  if (!socketActivo()) return next();

  const idRuta = idValido(ctx.params.id);
  const usuariosAntes = idRuta ? await usuariosDePartida(idRuta) : [];

  await next();

  if (ctx.status < 200 || ctx.status >= 300 || ctx.status === 202) return;

  const partidaId = idRuta || idValido(ctx.body?.partidaId);
  if (!partidaId) return;

  try {
    await avisarCambio(partidaId, motivo, { lobby, usuarios: usuariosAntes });
  } catch (error) {
    console.error(`No se pudo avisar por socket el cambio de la partida ${partidaId}:`, error);
  }
};