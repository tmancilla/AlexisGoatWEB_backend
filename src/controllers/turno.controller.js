const turnoService = require('../services/turno.service');

async function terminarTurno(ctx) {
  ctx.status = 200;
  ctx.body = await turnoService.terminarTurno(ctx.params.id, ctx.state.usuario);
}

async function abandonar(ctx) {
  ctx.status = 200;
  ctx.body = await turnoService.abandonar(ctx.params.id, ctx.state.usuario);
}

module.exports = {
  terminarTurno,
  abandonar,
};
