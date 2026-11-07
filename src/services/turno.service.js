const { Op } = require('sequelize');
const { sequelize, Partida, JugadorPartida, Barco, Casilla, EventoPartida } = require('../models');
const HttpError = require('../utils/HttpError');
const { validarId } = require('../utils/validaciones');
const { clave, mezclar } = require('../utils/tablero');
const {
  ACCIONES_POR_TURNO,
  CANTIDAD_BOTIN,
  CARTAS_EVENTO,
  CASILLAS_DE_RECURSO,
  COMBUSTIBLE_RESERVA,
  MUNICION_SABOTAJE,
  PUNTOS,
  RECOGIBLES,
  RECOLECCION,
  SEGUNDOS_TURNO,
  TIPOS_BOTIN} = require('../config/reglas');

const ESTADOS_ABANDONABLES = ['DESPLIEGUE', 'EN_CURSO'];

function jugadaInvalida(codigo, mensaje) {
  return new HttpError(422, codigo, mensaje);
}

async function buscarPartidaYJugador(partidaId, usuario, transaction) {
  const partida = await Partida.findByPk(partidaId, { lock: transaction.LOCK.UPDATE, transaction });
  if (!partida) {
    throw new HttpError(404, 'PARTIDA_NO_EXISTE', 'No existe una partida con ese ID.');
  }

  const jugador = await JugadorPartida.findOne({ where: { partidaId, usuarioId: usuario.id }, transaction });
  if (!jugador) {
    throw new HttpError(403, 'NO_PERTENECES_A_LA_PARTIDA', 'No eres jugador de esta partida.');
  }

  return { partida, jugador };
}

// regla 33 sabotaje
async function aplicarSabotaje(partida, transaction) {
  const jugadores = await JugadorPartida.findAll({
    where: { partidaId: partida.id },
    include: [{ association: 'usuario', attributes: ['username'] }],
    transaction});
  const [afectado] = mezclar(jugadores);
  const perdida = Math.min(MUNICION_SABOTAJE, afectado.municion);

  if (perdida > 0) {
    await afectado.decrement('municion', { by: perdida, transaction });
  }

  return `Le tocó a ${afectado.usuario.username}, que perdió ${perdida} de munición.`;
}

// regla 33 botin flotante
async function aparecerBotin(partida, transaction) {
  const jugadores = await JugadorPartida.findAll({ where: { partidaId: partida.id }, attributes: ['id'], transaction });
  const barcos = await Barco.findAll({
    where: { jugadorPartidaId: jugadores.map((jugador) => jugador.id), aFlote: true },
    attributes: ['x', 'y'],
    transaction});
  const ocupadas = new Set(barcos.map(clave));
  const agua = await Casilla.findAll({ where: { partidaId: partida.id, tipo: 'AGUA_ABIERTA', chatarra: 0 }, transaction });
  const [casilla] = mezclar(agua.filter((candidata) => !ocupadas.has(clave(candidata))));

  if (!casilla) {
    return 'No quedaban casillas vacías, así que no apareció botín.';
  }

  const [tipo] = mezclar(TIPOS_BOTIN);
  await casilla.update({ tipo, agotada: false }, { transaction });

  return `Apareció ${CANTIDAD_BOTIN} de ${RECOGIBLES[tipo].recurso} en (${casilla.x}, ${casilla.y}).`;
}

const EFECTOS_AL_REVELAR = {
  SABOTAJE: aplicarSabotaje,
  BOTIN_FLOTANTE: aparecerBotin};


async function revelarEvento(partida, ronda, transaction, tipoCarta = mezclar(Object.keys(CARTAS_EVENTO))[0]) {
  const efecto = EFECTOS_AL_REVELAR[tipoCarta];
  const detalle = efecto ? await efecto(partida, transaction) : null;
  const descripcion = detalle ? `${CARTAS_EVENTO[tipoCarta]} ${detalle}` : CARTAS_EVENTO[tipoCarta];

  return EventoPartida.create({ partidaId: partida.id, ronda, tipoCarta, descripcion }, { transaction });
}

async function iniciarTurno(jugador, transaction) {
  await jugador.reload({ transaction });
  const barcos = await Barco.findAll({ where: { jugadorPartidaId: jugador.id, aFlote: true }, transaction });
  const casillas = await Casilla.findAll({
    where: { partidaId: jugador.partidaId, tipo: Object.keys(RECOLECCION), agotada: false },
    transaction});
  const ocupadas = casillas.filter((casilla) => barcos.some((barco) => barco.x === casilla.x && barco.y === casilla.y));

  const recursos = { combustible: jugador.combustible, municion: jugador.municion };
  ocupadas.forEach((casilla) => {
    const { recurso, cantidad } = RECOLECCION[casilla.tipo];
    recursos[recurso] += cantidad;
  });
  if (recursos.combustible === 0 && ocupadas.length === 0) {
    recursos.combustible = COMBUSTIBLE_RESERVA;
  }

  await jugador.update({ ...recursos, accionesRestantes: ACCIONES_POR_TURNO }, { transaction });
}

// regla 36
async function calcularPuntajes(partidaId, jugadores, transaction) {
  const barcos = await Barco.findAll({
    where: { jugadorPartidaId: jugadores.map((jugador) => jugador.id) },
    include: [{ association: 'mejoras', attributes: ['id'], through: { attributes: [] } }],
    transaction});
  const recursos = await Casilla.findAll({ where: { partidaId, tipo: CASILLAS_DE_RECURSO, agotada: false }, transaction });

  return Object.fromEntries(jugadores.map((jugador) => {
    const propios = barcos.filter((barco) => barco.jugadorPartidaId === jugador.id);
    const aFlote = propios.filter((barco) => barco.aFlote);
    const enemigosHundidos = barcos.filter((barco) => barco.jugadorPartidaId !== jugador.id && !barco.aFlote).length;
    const casco = aFlote.reduce((suma, barco) => suma + barco.cascoActual, 0);
    const casillasOcupadas = recursos.filter((casilla) =>
      aFlote.some((barco) => barco.x === casilla.x && barco.y === casilla.y)).length;
    const mejoras = aFlote.reduce((suma, barco) => suma + barco.mejoras.length, 0);

    const detalle = {
      barcosAFlote: aFlote.length * PUNTOS.BARCO_A_FLOTE,
      cascoRestante: casco * PUNTOS.CASCO,
      enemigosHundidos: enemigosHundidos * PUNTOS.ENEMIGO_HUNDIDO,
      casillasRecurso: casillasOcupadas * PUNTOS.CASILLA_RECURSO,
      mejoras: mejoras * PUNTOS.MEJORA};
    const total = Object.values(detalle).reduce((suma, puntos) => suma + puntos, 0);

    return [jugador.id, { total, detalle, barcos: aFlote.length, casco }];
  }));
}

// regla 37: puntaje, después barcos a flote, después casco total; si todo empata no hay ganador
function desempatar(jugadores, puntajes) {
  const [a, b] = jugadores;
  for (const criterio of ['total', 'barcos', 'casco']) {
    if (puntajes[a.id][criterio] !== puntajes[b.id][criterio]) {
      return puntajes[a.id][criterio] > puntajes[b.id][criterio] ? a : b;
    }
  }
  return null;
}

async function finalizarPartida(partida, motivo, ganador, transaction) {
  const jugadores = await JugadorPartida.findAll({ where: { partidaId: partida.id }, transaction });
  const puntajes = await calcularPuntajes(partida.id, jugadores, transaction);

  let motivoFin = motivo;
  let ganadorFinal = ganador;
  if (motivo === 'LIMITE_RONDAS') {
    ganadorFinal = desempatar(jugadores, puntajes);
    if (!ganadorFinal) motivoFin = 'EMPATE';
  }

  for (const jugador of jugadores) {
    await jugador.update({ puntajeFinal: puntajes[jugador.id].total }, { transaction });
  }

  await partida.update({
    estado: 'TERMINADA',
    motivoFin,
    ganadorId: ganadorFinal ? ganadorFinal.id : null,
    turnoActualId: null,
    expiraEn: null,
    terminadaEn: new Date()}, { transaction });
}

// la ronda termina cuando el turno vuelve al jugador que partió la partida
async function pasarTurno(partida, transaction) {
  const jugadores = await JugadorPartida.findAll({ where: { partidaId: partida.id }, transaction });
  const siguiente = jugadores.find((jugador) => jugador.id !== partida.turnoActualId);
  const inicial = partida.jugadorInicialId || jugadores.find((jugador) => jugador.numeroJugador === 1).id;

  if (siguiente.id === inicial) {
    const ronda = partida.rondaActual + 1;
    if (ronda > partida.maxRondas) {
      await finalizarPartida(partida, 'LIMITE_RONDAS', null, transaction);
      return;
    }
    await partida.update({ rondaActual: ronda }, { transaction });
    await revelarEvento(partida, ronda, transaction);
  }

  await iniciarTurno(siguiente, transaction);
  await partida.update({
    turnoActualId: siguiente.id,
    expiraEn: new Date(Date.now() + SEGUNDOS_TURNO * 1000)}, { transaction });
}

async function resumenTurno(partida, transaction) {
  const turno = partida.turnoActualId
    ? await JugadorPartida.findByPk(partida.turnoActualId, { transaction })
    : null;

  return {
    partidaId: partida.id,
    estado: partida.estado,
    ronda: partida.rondaActual,
    jugadorActivo: turno ? turno.usuarioId : null,
    turnoExpiraEn: partida.estado === 'EN_CURSO' ? partida.expiraEn : null};
}

async function terminarTurno(id, usuario) {
  const partidaId = validarId(id);

  return sequelize.transaction(async (transaction) => {
    const { partida, jugador } = await buscarPartidaYJugador(partidaId, usuario, transaction);

    if (partida.estado !== 'EN_CURSO') {
      throw jugadaInvalida('PARTIDA_NO_ACTIVA', 'La partida no esta en curso.');
    }
    if (partida.turnoActualId !== jugador.id) {
      throw jugadaInvalida('NO_ES_TU_TURNO', 'No es tu turno, espera a que el rival termine.');
    }

    await pasarTurno(partida, transaction);
    return resumenTurno(partida, transaction);
  });
}

// regla 15: si se acabó el tiempo, el servidor cierra el turno con las acciones que alcanzaron a hacerse
async function resolverTurnoVencido(partidaId) {
  return sequelize.transaction(async (transaction) => {
    const partida = await Partida.findByPk(partidaId, { lock: transaction.LOCK.UPDATE, transaction });
    if (!partida || partida.estado !== 'EN_CURSO' || !partida.expiraEn || partida.expiraEn > new Date()) return false;

    await pasarTurno(partida, transaction);
    return true;
  });
}

// regla 38
async function abandonar(id, usuario) {
  const partidaId = validarId(id);

  return sequelize.transaction(async (transaction) => {
    const { partida, jugador } = await buscarPartidaYJugador(partidaId, usuario, transaction);

    if (!ESTADOS_ABANDONABLES.includes(partida.estado)) {
      throw jugadaInvalida(
        'PARTIDA_NO_ACTIVA',
        'Solo se puede abandonar una partida en despliegue o en curso. Para salir de un lobby usa DELETE /games/:id.');
    }

    const rival = await JugadorPartida.findOne({
      where: { partidaId, id: { [Op.ne]: jugador.id } },
      transaction});
    await finalizarPartida(partida, 'ABANDONO', rival, transaction);

    return {
      partidaId: partida.id,
      estado: partida.estado,
      motivo: partida.motivoFin,
      ganador: rival ? rival.usuarioId : null};
  });
}

async function eventoDeRonda(partida) {
  if (partida.estado !== 'EN_CURSO') return null;

  const evento = await EventoPartida.findOne({ where: { partidaId: partida.id, ronda: partida.rondaActual } });
  return evento ? { carta: evento.tipoCarta, efecto: evento.descripcion } : null;
}

async function armarResultado(partida) {
  if (partida.estado !== 'TERMINADA' || !partida.motivoFin) return null;

  const jugadores = await JugadorPartida.findAll({ where: { partidaId: partida.id } });
  const puntajes = await calcularPuntajes(partida.id, jugadores);
  const ganador = jugadores.find((jugador) => jugador.id === partida.ganadorId);

  return {
    motivo: partida.motivoFin,
    ganador: ganador ? ganador.usuarioId : null,
    puntajes: Object.fromEntries(jugadores.map((jugador) => [
      jugador.usuarioId,
      { total: puntajes[jugador.id].total, detalle: puntajes[jugador.id].detalle }]))};
}

module.exports = {
  revelarEvento,
  finalizarPartida,
  terminarTurno,
  resolverTurnoVencido,
  abandonar,
  eventoDeRonda,
  armarResultado,
};
