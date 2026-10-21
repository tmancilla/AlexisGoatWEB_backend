const { sequelize, Partida, JugadorPartida, Barco } = require('../models');
const HttpError = require('../utils/HttpError');
const { validarId } = require('../utils/validaciones');
const tableroService = require('./tablero.service');
const { clave, dentroDelTablero, enZonaDespliegue, casillasDeZona, mezclar } = require('../utils/tablero');
const {
  BARCOS,
  TIPOS_BARCO,
  ZONAS_DESPLIEGUE,
  COMBUSTIBLE_EXTRA_SEGUNDO,
  SEGUNDOS_DESPLIEGUE,
  SEGUNDOS_TURNO} = require('../config/reglas');

function despliegueInvalido(mensaje) {
  return new HttpError(400, 'DESPLIEGUE_INVALIDO', mensaje);
}

function validarBarcos(barcos, numeroJugador) {
  if (!Array.isArray(barcos) || barcos.length !== TIPOS_BARCO.length) {
    throw despliegueInvalido(`Debes enviar exactamente ${TIPOS_BARCO.length} barcos.`);
  }

  const zona = ZONAS_DESPLIEGUE[numeroJugador];
  barcos.forEach((barco) => {
    if (!barco || !TIPOS_BARCO.includes(barco.tipo)) {
      throw despliegueInvalido(`El tipo de barco debe ser uno de: ${TIPOS_BARCO.join(', ')}.`);
    }
    if (!barco.casilla || !dentroDelTablero(barco.casilla)) {
      throw despliegueInvalido(`La casilla de ${barco.tipo} debe tener x e y enteros entre 1 y 10.`);
    }
    if (!enZonaDespliegue(barco.casilla, numeroJugador)) {
      throw despliegueInvalido(`${barco.tipo} debe ir en tu zona, entre las filas ${zona.desde} y ${zona.hasta}.`);
    }
  });

  if (new Set(barcos.map((barco) => barco.tipo)).size !== TIPOS_BARCO.length) {
    throw despliegueInvalido(`Debe venir un barco de cada tipo: ${TIPOS_BARCO.join(', ')}.`);
  }
  if (new Set(barcos.map((barco) => clave(barco.casilla))).size !== barcos.length) {
    throw despliegueInvalido('Cada barco debe ir en una casilla distinta.');
  }

  return barcos.map(({ tipo, casilla }) => ({ tipo, x: casilla.x, y: casilla.y }));
}

function posicionesAlAzar(numeroJugador) {
  const casillas = mezclar(casillasDeZona(numeroJugador));
  return TIPOS_BARCO.map((tipo, i) => ({ tipo, x: casillas[i].x, y: casillas[i].y }));
}

function crearBarcos(jugadorPartidaId, posiciones, transaction) {
  return Barco.bulkCreate(
    posiciones.map(({ tipo, x, y }) => ({
      jugadorPartidaId,
      tipo,
      x,
      y,
      cascoActual: BARCOS[tipo].casco,
      cascoMaximo: BARCOS[tipo].casco,
      movimiento: BARCOS[tipo].movimiento,
      alcance: BARCOS[tipo].alcance,
      deteccion: BARCOS[tipo].deteccion})),
    { validate: true, transaction });
}

async function iniciarDespliegue(partida, transaction) {
  await tableroService.generarTablero(partida.id, transaction);
  await partida.update({ expiraEn: new Date(Date.now() + SEGUNDOS_DESPLIEGUE * 1000) }, { transaction });
}

async function iniciarPartida(partida, transaction) {
  const jugadores = await JugadorPartida.findAll({ where: { partidaId: partida.id }, transaction });
  if (jugadores.length < 2 || jugadores.some((jugador) => !jugador.listo)) return;

  const [primero, segundo] = mezclar(jugadores);
  await segundo.increment('combustible', { by: COMBUSTIBLE_EXTRA_SEGUNDO, transaction });
  await partida.update({
    estado: 'EN_CURSO',
    rondaActual: 1,
    turnoActualId: primero.id,
    expiraEn: new Date(Date.now() + SEGUNDOS_TURNO * 1000)}, { transaction });
}

async function resolverDespliegueVencido(partidaId) {
  return sequelize.transaction(async (transaction) => {
    const partida = await Partida.findByPk(partidaId, { lock: transaction.LOCK.UPDATE, transaction });
    if (!partida || partida.estado !== 'DESPLIEGUE' || !partida.expiraEn || partida.expiraEn > new Date()) return false;

    const pendientes = await JugadorPartida.findAll({ where: { partidaId, listo: false }, transaction });
    for (const jugador of pendientes) {
      await crearBarcos(jugador.id, posicionesAlAzar(jugador.numeroJugador), transaction);
      await jugador.update({ listo: true }, { transaction });
    }

    await iniciarPartida(partida, transaction);
    return true;
  });
}

async function desplegar(id, usuario, datos) {
  const partidaId = validarId(id);
  const vencido = await resolverDespliegueVencido(partidaId);

  return sequelize.transaction(async (transaction) => {
    const partida = await Partida.findByPk(partidaId, { lock: transaction.LOCK.UPDATE, transaction });
    if (!partida) {
      throw new HttpError(404, 'PARTIDA_NO_EXISTE', 'No existe una partida con ese ID.');
    }

    const jugador = await JugadorPartida.findOne({ where: { partidaId, usuarioId: usuario.id }, transaction });
    if (!jugador) {
      throw new HttpError(403, 'NO_PERTENECES_A_LA_PARTIDA', 'No eres jugador de esta partida.');
    }
    if (vencido) {
      throw new HttpError(409, 'PARTIDA_NO_ACTIVA', 'Se acabo el tiempo de despliegue y el servidor ubico al azar los barcos que faltaban.');
    }
    if (partida.estado !== 'DESPLIEGUE') {
      throw new HttpError(409, 'PARTIDA_NO_ACTIVA', 'La partida no esta en la fase de despliegue.');
    }
    if (jugador.listo) {
      throw new HttpError(409, 'YA_DESPLEGASTE', 'Ya desplegaste tu flota en esta partida.');
    }

    await crearBarcos(jugador.id, validarBarcos(datos.barcos, jugador.numeroJugador), transaction);
    await jugador.update({ listo: true }, { transaction });
    await iniciarPartida(partida, transaction);

    const turno = partida.turnoActualId
      ? await JugadorPartida.findByPk(partida.turnoActualId, { transaction })
      : null;

    return { partidaId, estado: partida.estado, jugadorActivo: turno ? turno.usuarioId : null };
  });
}

module.exports = {
  iniciarDespliegue,
  resolverDespliegueVencido,
  desplegar,
};
