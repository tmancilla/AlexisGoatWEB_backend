const { Partida, JugadorPartida, Barco, Combate } = require('../models');
const HttpError = require('../utils/HttpError');
const { validarId } = require('../utils/validaciones');

const CAMPOS_EDITABLES = ['tipo', 'dadoAtacante', 'dadoDefensor', 'impacto', 'ronda'];

const INCLUIR_BARCOS = [
  { association: 'atacante', attributes: ['id', 'tipo', 'jugadorPartidaId'], include: [{ association: 'jugadorPartida', attributes: ['partidaId', 'usuarioId'] }] },
  { association: 'defensor', attributes: ['id', 'tipo', 'jugadorPartidaId'], include: [{ association: 'jugadorPartida', attributes: ['partidaId', 'usuarioId'] }] }];

async function verificarAcceso(partidaId, usuario) {
  const partida = await Partida.findByPk(partidaId);
  if (!partida) {
    throw new HttpError(404, 'PARTIDA_NO_EXISTE', 'No existe una partida con ese ID.');
  }
  if (usuario.role !== 'Administrador') {
    const jugador = await JugadorPartida.findOne({ where: { partidaId, usuarioId: usuario.id } });
    if (!jugador) {
      throw new HttpError(403, 'NO_PERTENECES_A_LA_PARTIDA', 'No eres jugador de esta partida.');
    }
  }
  return partida;
}

function exigirAdministrador(usuario) {
  if (usuario.role !== 'Administrador') {
    throw new HttpError(403, 'SOLO_ADMINISTRADOR', 'Solo un administrador puede crear, modificar o eliminar combates.');
  }
}

async function buscarCombate(partidaId, combateId) {
  const combate = await Combate.findByPk(combateId, { include: INCLUIR_BARCOS });
  if (!combate || combate.atacante.jugadorPartida.partidaId !== partidaId) {
    throw new HttpError(404, 'COMBATE_NO_EXISTE', 'No existe un combate con ese ID en esta partida.');
  }
  return combate;
}

async function validarBarcos(partidaId, atacanteId, defensorId) {
  const ids = [atacanteId, defensorId].map((id) => Number(id));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new HttpError(400, 'COMBATE_INVALIDO', 'atacanteId y defensorId deben ser ids de barcos.');
  }
  const barcos = await Barco.findAll({ where: { id: ids }, include: [{ association: 'jugadorPartida', attributes: ['partidaId'] }] });
  const atacante = barcos.find((barco) => barco.id === ids[0]);
  const defensor = barcos.find((barco) => barco.id === ids[1]);
  if (!atacante || !defensor || atacante.jugadorPartida.partidaId !== partidaId || defensor.jugadorPartida.partidaId !== partidaId) {
    throw new HttpError(400, 'COMBATE_INVALIDO', 'Los dos barcos deben existir y ser de esta partida.');
  }
  if (atacante.jugadorPartidaId === defensor.jugadorPartidaId) {
    throw new HttpError(400, 'COMBATE_INVALIDO', 'El atacante y el defensor deben ser de jugadores distintos.');
  }
}

async function listarCombates(id, usuario) {
  const partidaId = validarId(id);
  await verificarAcceso(partidaId, usuario);

  return Combate.findAll({
    include: [
      {
        association: 'atacante',
        attributes: ['id', 'tipo', 'jugadorPartidaId'],
        required: true,
        include: [{ association: 'jugadorPartida', attributes: ['partidaId', 'usuarioId'], where: { partidaId } }]},
      INCLUIR_BARCOS[1]],
    order: [['ronda', 'ASC'], ['id', 'ASC']]});
}

async function obtenerCombate(id, combateId, usuario) {
  const partidaId = validarId(id);
  const idCombate = validarId(combateId);
  await verificarAcceso(partidaId, usuario);

  return buscarCombate(partidaId, idCombate);
}

async function crearCombate(id, usuario, datos) {
  const partidaId = validarId(id);
  exigirAdministrador(usuario);
  await verificarAcceso(partidaId, usuario);

  if (datos.atacanteId === undefined || datos.defensorId === undefined || datos.tipo === undefined || datos.ronda === undefined) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', 'Debes enviar atacanteId, defensorId, tipo y ronda.');
  }
  await validarBarcos(partidaId, datos.atacanteId, datos.defensorId);

  const combate = await Combate.create({
    atacanteId: Number(datos.atacanteId),
    defensorId: Number(datos.defensorId),
    tipo: datos.tipo,
    dadoAtacante: datos.dadoAtacante ?? null,
    dadoDefensor: datos.dadoDefensor ?? null,
    impacto: Boolean(datos.impacto),
    ronda: datos.ronda});
  return buscarCombate(partidaId, combate.id);
}

async function actualizarCombate(id, combateId, usuario, datos) {
  const partidaId = validarId(id);
  const idCombate = validarId(combateId);
  exigirAdministrador(usuario);
  await verificarAcceso(partidaId, usuario);
  const combate = await buscarCombate(partidaId, idCombate);

  const cambios = Object.fromEntries(CAMPOS_EDITABLES
    .filter((campo) => datos[campo] !== undefined)
    .map((campo) => [campo, datos[campo]]));
  if (Object.keys(cambios).length === 0) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', `Debes enviar al menos uno de: ${CAMPOS_EDITABLES.join(', ')}.`);
  }

  await combate.update(cambios);
  return buscarCombate(partidaId, idCombate);
}

async function eliminarCombate(id, combateId, usuario) {
  const partidaId = validarId(id);
  const idCombate = validarId(combateId);
  exigirAdministrador(usuario);
  await verificarAcceso(partidaId, usuario);
  const combate = await buscarCombate(partidaId, idCombate);

  await combate.destroy();
}

module.exports = {
  listarCombates,
  obtenerCombate,
  crearCombate,
  actualizarCombate,
  eliminarCombate,
};
