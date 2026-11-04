const { Partida, Casilla } = require('../models');
const HttpError = require('../utils/HttpError');
const { validarId } = require('../utils/validaciones');

const ESTADOS_EDITABLES = ['DESPLIEGUE', 'EN_CURSO'];
const CAMPOS_EDITABLES = ['tipo', 'agotada'];

async function buscarPartida(id) {
  const partida = await Partida.findByPk(validarId(id));
  if (!partida) {
    throw new HttpError(404, 'PARTIDA_NO_EXISTE', 'No existe una partida con ese ID.');
  }
  return partida;
}

function exigirDespliegue(partida) {
  if (partida.estado !== 'DESPLIEGUE') {
    throw new HttpError(409, 'PARTIDA_NO_EN_DESPLIEGUE', 'Solo se pueden crear o eliminar casillas mientras la partida esta en despliegue.');
  }
}

function exigirEditable(partida) {
  if (!ESTADOS_EDITABLES.includes(partida.estado)) {
    throw new HttpError(409, 'PARTIDA_NO_EDITABLE', 'Solo se pueden modificar casillas de una partida en despliegue o en curso.');
  }
}

async function buscarCasilla(partidaId, casillaId) {
  const casilla = await Casilla.findOne({ where: { id: validarId(casillaId), partidaId } });
  if (!casilla) {
    throw new HttpError(404, 'CASILLA_NO_EXISTE', 'No existe una casilla con ese ID en esta partida.');
  }
  return casilla;
}

async function listarCasillas(id) {
  const partida = await buscarPartida(id);

  return Casilla.findAll({
    where: { partidaId: partida.id },
    order: [['y', 'ASC'], ['x', 'ASC']]});
}

async function obtenerCasilla(id, casillaId) {
  const partida = await buscarPartida(id);
  return buscarCasilla(partida.id, casillaId);
}

async function crearCasilla(id, datos) {
  const partida = await buscarPartida(id);
  exigirDespliegue(partida);

  if (datos.x === undefined || datos.y === undefined || datos.tipo === undefined) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', 'Debes enviar x, y y tipo.');
  }

  const repetida = await Casilla.findOne({ where: { partidaId: partida.id, x: datos.x, y: datos.y } });
  if (repetida) {
    throw new HttpError(409, 'CASILLA_REPETIDA', `Ya existe una casilla en (${datos.x}, ${datos.y}).`);
  }

  return Casilla.create({
    partidaId: partida.id,
    x: datos.x,
    y: datos.y,
    tipo: datos.tipo,
    agotada: Boolean(datos.agotada)});
}

async function actualizarCasilla(id, casillaId, datos) {
  const partida = await buscarPartida(id);
  exigirEditable(partida);
  const casilla = await buscarCasilla(partida.id, casillaId);

  const cambios = Object.fromEntries(CAMPOS_EDITABLES
    .filter((campo) => datos[campo] !== undefined)
    .map((campo) => [campo, datos[campo]]));
  if (Object.keys(cambios).length === 0) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', `Debes enviar al menos uno de: ${CAMPOS_EDITABLES.join(', ')}.`);
  }

  return casilla.update(cambios);
}

async function eliminarCasilla(id, casillaId) {
  const partida = await buscarPartida(id);
  exigirDespliegue(partida);
  const casilla = await buscarCasilla(partida.id, casillaId);

  await casilla.destroy();
}

module.exports = {
  listarCasillas,
  obtenerCasilla,
  crearCasilla,
  actualizarCasilla,
  eliminarCasilla,
};
