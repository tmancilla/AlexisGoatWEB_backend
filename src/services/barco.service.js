const { Partida, JugadorPartida, Barco } = require('../models');
const HttpError = require('../utils/HttpError');
const { validarId } = require('../utils/validaciones');
const { enZonaDespliegue } = require('../utils/tablero');
const { BARCOS, TIPOS_BARCO, ZONAS_DESPLIEGUE } = require('../config/reglas');

const ESTADOS_EDITABLES = ['DESPLIEGUE', 'EN_CURSO'];
const STATS_EDITABLES = ['cascoMaximo', 'movimiento', 'alcance', 'deteccion', 'aFlote'];
const INCLUIR_JUGADOR = [{ association: 'jugadorPartida', attributes: ['partidaId', 'usuarioId', 'numeroJugador'] }];

async function buscarPartida(id) {
  const partida = await Partida.findByPk(validarId(id));
  if (!partida) {
    throw new HttpError(404, 'PARTIDA_NO_EXISTE', 'No existe una partida con ese ID.');
  }
  return partida;
}

function exigirDespliegue(partida) {
  if (partida.estado !== 'DESPLIEGUE') {
    throw new HttpError(409, 'PARTIDA_NO_EN_DESPLIEGUE', 'Solo se pueden crear o eliminar barcos mientras la partida esta en despliegue.');
  }
}

function exigirEditable(partida) {
  if (!ESTADOS_EDITABLES.includes(partida.estado)) {
    throw new HttpError(409, 'PARTIDA_NO_EDITABLE', 'Solo se pueden modificar barcos de una partida en despliegue o en curso.');
  }
}

async function buscarBarco(partidaId, barcoId) {
  const barco = await Barco.findByPk(validarId(barcoId), { include: INCLUIR_JUGADOR });
  if (!barco || barco.jugadorPartida.partidaId !== partidaId) {
    throw new HttpError(404, 'BARCO_NO_EXISTE', 'No existe un barco con ese ID en esta partida.');
  }
  return barco;
}

function leerCasilla(casilla) {
  if (!casilla || typeof casilla !== 'object') {
    throw new HttpError(400, 'BARCO_INVALIDO', 'La casilla debe venir como { x, y }.');
  }
  return { x: Number(casilla.x), y: Number(casilla.y) };
}

async function revisarCasillaLibre(partidaId, casilla, barcoId) {
  const ocupante = await Barco.findOne({
    where: { x: casilla.x, y: casilla.y, aFlote: true },
    include: [{ association: 'jugadorPartida', where: { partidaId }, attributes: [] }]});
  if (ocupante && ocupante.id !== barcoId) {
    throw new HttpError(409, 'CASILLA_OCUPADA', 'Ya hay un barco en esa casilla.');
  }
}

async function listarBarcos(id) {
  const partida = await buscarPartida(id);

  return Barco.findAll({
    include: [{ ...INCLUIR_JUGADOR[0], where: { partidaId: partida.id } }],
    order: [['jugadorPartidaId', 'ASC'], ['id', 'ASC']]});
}

async function obtenerBarco(id, barcoId) {
  const partida = await buscarPartida(id);
  return buscarBarco(partida.id, barcoId);
}

async function crearBarco(id, datos) {
  const partida = await buscarPartida(id);
  exigirDespliegue(partida);

  if (datos.jugadorId === undefined || datos.tipo === undefined || datos.casilla === undefined) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', 'Debes enviar jugadorId, tipo y casilla.');
  }
  if (!TIPOS_BARCO.includes(datos.tipo)) {
    throw new HttpError(400, 'BARCO_INVALIDO', `El tipo de barco debe ser uno de: ${TIPOS_BARCO.join(', ')}.`);
  }

  const jugador = await JugadorPartida.findOne({ where: { partidaId: partida.id, usuarioId: validarId(datos.jugadorId) } });
  if (!jugador) {
    throw new HttpError(400, 'BARCO_INVALIDO', 'El jugadorId debe ser de un jugador de esta partida.');
  }

  const casilla = leerCasilla(datos.casilla);
  if (!enZonaDespliegue(casilla, jugador.numeroJugador)) {
    const zona = ZONAS_DESPLIEGUE[jugador.numeroJugador];
    throw new HttpError(400, 'BARCO_INVALIDO', `La casilla debe estar en la zona del jugador, entre las filas ${zona.desde} y ${zona.hasta}.`);
  }

  const repetido = await Barco.findOne({ where: { jugadorPartidaId: jugador.id, tipo: datos.tipo } });
  if (repetido) {
    throw new HttpError(409, 'BARCO_REPETIDO', `Ese jugador ya tiene un barco de tipo ${datos.tipo}.`);
  }
  await revisarCasillaLibre(partida.id, casilla);

  const stats = BARCOS[datos.tipo];
  const barco = await Barco.create({
    jugadorPartidaId: jugador.id,
    tipo: datos.tipo,
    x: casilla.x,
    y: casilla.y,
    cascoActual: stats.casco,
    cascoMaximo: stats.casco,
    movimiento: stats.movimiento,
    alcance: stats.alcance,
    deteccion: stats.deteccion});

  return buscarBarco(partida.id, barco.id);
}

async function actualizarBarco(id, barcoId, datos) {
  const partida = await buscarPartida(id);
  exigirEditable(partida);
  const barco = await buscarBarco(partida.id, barcoId);

  const cambios = Object.fromEntries(STATS_EDITABLES
    .filter((campo) => datos[campo] !== undefined)
    .map((campo) => [campo, datos[campo]]));
  if (datos.casco !== undefined) cambios.cascoActual = datos.casco;
  if (datos.casilla !== undefined) {
    const casilla = leerCasilla(datos.casilla);
    await revisarCasillaLibre(partida.id, casilla, barco.id);
    cambios.x = casilla.x;
    cambios.y = casilla.y;
  }

  if (Object.keys(cambios).length === 0) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', `Debes enviar al menos uno de: casilla, casco, ${STATS_EDITABLES.join(', ')}.`);
  }

  await barco.update(cambios);
  return buscarBarco(partida.id, barco.id);
}

async function eliminarBarco(id, barcoId) {
  const partida = await buscarPartida(id);
  exigirDespliegue(partida);
  const barco = await buscarBarco(partida.id, barcoId);

  await barco.destroy();
}

module.exports = {
  listarBarcos,
  obtenerBarco,
  crearBarco,
  actualizarBarco,
  eliminarBarco,
};
