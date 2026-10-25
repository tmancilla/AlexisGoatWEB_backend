const { Partida, JugadorPartida, Casilla, CasillaRevelada, Accion } = require('../models');
const { resolverDespliegueVencido } = require('./despliegue.service');
const { resolverTurnoVencido, eventoDeRonda, armarResultado } = require('./turno.service');
const { clave, casillasVistas } = require('../utils/tablero');
const { BARCOS, TIPOS_BARCO, CASILLAS_DE_RECURSO } = require('../config/reglas');

const ESTADOS_DE_JUEGO = ['DESPLIEGUE', 'EN_CURSO', 'TERMINADA'];
const ESTADOS_CON_VISION = ['EN_CURSO', 'TERMINADA'];

function barcoPropio(barco) {
  return {
    barcoId: barco.id,
    tipo: barco.tipo,
    casilla: { x: barco.x, y: barco.y },
    casco: barco.cascoActual,
    cascoMaximo: barco.cascoMaximo,
    movimiento: barco.movimiento,
    alcance: barco.alcance,
    deteccion: barco.deteccion,
    dado: BARCOS[barco.tipo].dado,
    mejoras: barco.mejoras.map((mejora) => mejora.nombre),
    aFlote: barco.aFlote};
}

function contactoEnemigo(barco) {
  return {
    barcoId: barco.id,
    tipo: barco.tipo,
    casilla: { x: barco.x, y: barco.y },
    casco: barco.cascoActual,
    aFlote: barco.aFlote,
    visible: true};
}

function ordenarPorTipo(barcos) {
  return [...barcos].sort((a, b) => TIPOS_BARCO.indexOf(a.tipo) - TIPOS_BARCO.indexOf(b.tipo));
}

function tipoVisible(casilla, revelada) {
  if (casilla.agotada) return 'AGUA_ABIERTA';
  if (casilla.tipo === 'CORRIENTE_PELIGROSA' && !revelada) return 'AGUA_ABIERTA';
  return casilla.tipo;
}

function casillasVisibles(casillas, vistas, reveladas, barcosAFlote) {
  const ocupantes = new Map(barcosAFlote.map((barco) => [clave(barco), barco.id]));

  return casillas
    .filter((casilla) => vistas.has(clave(casilla)) || reveladas.has(casilla.id))
    .map((casilla) => {
      const revelada = reveladas.get(casilla.id);
      const tipo = tipoVisible(casilla, revelada);
      const visible = { x: casilla.x, y: casilla.y, tipo };
      if (CASILLAS_DE_RECURSO.includes(tipo)) visible.ocupadaPor = ocupantes.get(clave(casilla)) || null;
      if (revelada) visible.reveladaEnRonda = revelada.rondaDescubierta;
      return visible;});
}

async function armarEstado(partidaId, usuarioId) {
  await resolverDespliegueVencido(partidaId);
  await resolverTurnoVencido(partidaId);

  const partida = await Partida.findByPk(partidaId);
  if (!partida || !ESTADOS_DE_JUEGO.includes(partida.estado)) return null;

  const jugadores = await JugadorPartida.findAll({
    where: { partidaId },
    include: [
      { association: 'usuario', attributes: ['id', 'username'] },
      { association: 'barcos', include: [{ association: 'mejoras', attributes: ['nombre'], through: { attributes: [] } }] }]});

  const yo = jugadores.find((jugador) => jugador.usuarioId === usuarioId);
  if (!yo) return null;
  const rival = jugadores.find((jugador) => jugador.id !== yo.id) || null;

  const misBarcos = ordenarPorTipo(yo.barcos);
  const barcosRival = rival ? ordenarPorTipo(rival.barcos) : [];
  const turno = jugadores.find((jugador) => jugador.id === partida.turnoActualId);

  const accionesDeLaRonda = partida.estado === 'EN_CURSO'
    ? await Accion.findAll({ where: { jugadorPartidaId: yo.id, ronda: partida.rondaActual }, attributes: ['barcoId'] })
    : [];
  const accionesPorBarco = Object.fromEntries(misBarcos.map((barco) => [
    barco.id,
    accionesDeLaRonda.filter((accion) => accion.barcoId === barco.id).length]));

  let visibles = [];
  let contactos = [];
  if (ESTADOS_CON_VISION.includes(partida.estado)) {
    const vistas = casillasVistas(misBarcos);
    const reveladas = new Map((await CasillaRevelada.findAll({ where: { jugadorPartidaId: yo.id } }))
      .map((revelada) => [revelada.casillaId, revelada]));
    const casillas = await Casilla.findAll({ where: { partidaId }, order: [['y', 'ASC'], ['x', 'ASC']] });

    const enemigosVistos = barcosRival.filter((barco) => vistas.has(clave(barco)));
    contactos = enemigosVistos.map(contactoEnemigo);
    visibles = casillasVisibles(
      casillas,
      vistas,
      reveladas,
      misBarcos.concat(enemigosVistos).filter((barco) => barco.aFlote));
  }

  return {
    partidaId: partida.id,
    estado: partida.estado,
    ronda: partida.rondaActual,
    rondaMaxima: partida.maxRondas,
    jugadorActivo: turno ? turno.usuarioId : null,
    turnoExpiraEn: partida.estado === 'EN_CURSO' ? partida.expiraEn : null,
    despliegueExpiraEn: partida.estado === 'DESPLIEGUE' ? partida.expiraEn : null,
    eventoRonda: await eventoDeRonda(partida),
    yo: {
      jugadorId: yo.usuarioId,
      username: yo.usuario.username,
      numeroJugador: yo.numeroJugador,
      listo: yo.listo,
      conectado: true,
      recursos: { combustible: yo.combustible, municion: yo.municion, chatarra: yo.chatarra },
      accionesRestantes: yo.accionesRestantes,
      accionesPorBarco,
      flota: misBarcos.map(barcoPropio)},
    rival: rival
      ? {
        jugadorId: rival.usuarioId,
        username: rival.usuario.username,
        numeroJugador: rival.numeroJugador,
        listo: rival.listo,
        conectado: true,
        segundosParaAbandono: null,
        barcosAFlote: barcosRival.filter((barco) => barco.aFlote).length}
      : null,
    casillasVisibles: visibles,
    contactosEnemigos: contactos,
    resultadoFinal: await armarResultado(partida)};
}

module.exports = {
  armarEstado,
};
