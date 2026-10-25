const { BARCOS, TAMANO_TABLERO } = require('../config/reglas');

const ESPECIALES = [
  { x: 5, y: 4, tipo: 'POZO_PETROLERO' },
  { x: 3, y: 5, tipo: 'POZO_PETROLERO' },
  { x: 7, y: 6, tipo: 'POZO_PETROLERO' },
  { x: 2, y: 6, tipo: 'DEPOSITO_MUNICION' },
  { x: 8, y: 5, tipo: 'DEPOSITO_MUNICION' },
  { x: 6, y: 7, tipo: 'DEPOSITO_MUNICION' },
  { x: 1, y: 5, tipo: 'NAUFRAGIO' },
  { x: 4, y: 7, tipo: 'NAUFRAGIO' },
  { x: 9, y: 4, tipo: 'NAUFRAGIO', agotada: true },
  { x: 2, y: 3, tipo: 'CORRIENTE_PELIGROSA' },
  { x: 5, y: 5, tipo: 'CORRIENTE_PELIGROSA' },
  { x: 8, y: 8, tipo: 'CORRIENTE_PELIGROSA' }];

const FLOTAS = {
  demo_karla: [
    { tipo: 'LANCHA', x: 5, y: 4 },
    { tipo: 'FRAGATA', x: 3, y: 3, cascoActual: 1 },
    { tipo: 'DESTRUCTOR', x: 7, y: 3, cascoActual: 4, cascoMaximo: 4 },
    { tipo: 'ACORAZADO', x: 4, y: 2 }],
  demo_diego: [
    { tipo: 'LANCHA', x: 6, y: 6 },
    { tipo: 'FRAGATA', x: 7, y: 8 },
    { tipo: 'DESTRUCTOR', x: 3, y: 8, cascoActual: 2 },
    { tipo: 'ACORAZADO', x: 5, y: 9 }]};

async function buscarPartidaDemo(queryInterface) {
  const [jugadores] = await queryInterface.sequelize.query(
    `SELECT jp.id, jp."partidaId", u.username
     FROM "JugadoresPartida" jp
     JOIN "Usuarios" u ON u.id = jp."usuarioId"
     JOIN "Partidas" p ON p.id = jp."partidaId"
     WHERE u.username IN ('demo_karla', 'demo_diego') AND p.estado = 'EN_CURSO'`);
  if (jugadores.length !== 2) return null;
  return {
    partidaId: jugadores[0].partidaId,
    jugador: Object.fromEntries(jugadores.map((jugador) => [jugador.username, jugador.id]))};
}

module.exports = {
  async up(queryInterface) {
    const demo = await buscarPartidaDemo(queryInterface);
    if (!demo) return;
    const ahora = new Date();
    const fechas = { createdAt: ahora, updatedAt: ahora };

    const casillas = [];
    for (let y = 1; y <= TAMANO_TABLERO; y += 1) {
      for (let x = 1; x <= TAMANO_TABLERO; x += 1) {
        const especial = ESPECIALES.find((casilla) => casilla.x === x && casilla.y === y);
        casillas.push({
          partidaId: demo.partidaId,
          x,
          y,
          tipo: especial ? especial.tipo : 'AGUA_ABIERTA',
          agotada: Boolean(especial && especial.agotada),
          ...fechas});
      }
    }
    const casillasCreadas = await queryInterface.bulkInsert('Casillas', casillas, { returning: true });

    const barcos = Object.entries(FLOTAS).flatMap(([username, flota]) => flota.map((barco) => ({
      jugadorPartidaId: demo.jugador[username],
      tipo: barco.tipo,
      x: barco.x,
      y: barco.y,
      cascoActual: barco.cascoActual || BARCOS[barco.tipo].casco,
      cascoMaximo: barco.cascoMaximo || BARCOS[barco.tipo].casco,
      movimiento: BARCOS[barco.tipo].movimiento,
      alcance: BARCOS[barco.tipo].alcance,
      deteccion: BARCOS[barco.tipo].deteccion,
      aFlote: true,
      ...fechas})));
    const barcosCreados = await queryInterface.bulkInsert('Barcos', barcos, { returning: true });
    const barco = (username, tipo) => barcosCreados
      .find((creado) => creado.jugadorPartidaId === demo.jugador[username] && creado.tipo === tipo).id;

    const [[blindaje]] = await queryInterface.sequelize.query(
      `SELECT id FROM "CatalogoMejoras" WHERE nombre = 'BLINDAJE'`);
    if (blindaje) {
      await queryInterface.bulkInsert('MejorasBarco', [{
        barcoId: barco('demo_karla', 'DESTRUCTOR'),
        catalogoMejoraId: blindaje.id,
        rondaAdquirida: 3,
        ...fechas}]);
    }

    const corriente = casillasCreadas.find((casilla) => casilla.x === 2 && casilla.y === 3);
    await queryInterface.bulkInsert('CasillasReveladas', [{
      jugadorPartidaId: demo.jugador.demo_karla,
      casillaId: corriente.id,
      rondaDescubierta: 2,
      ...fechas}]);

    await queryInterface.bulkInsert('Acciones', [
      {
        jugadorPartidaId: demo.jugador.demo_karla,
        barcoId: barco('demo_karla', 'FRAGATA'),
        tipo: 'MOVER',
        ronda: 2,
        resultado: JSON.stringify({
          casillaDestino: { x: 1, y: 3 },
          casillaFinal: { x: 2, y: 3 },
          casillasRecorridas: 1,
          detenidoPor: 'CORRIENTE_PELIGROSA',
          dano: 1,
          costos: { combustible: 1, acciones: 1 }}),
        ...fechas},
      {
        jugadorPartidaId: demo.jugador.demo_karla,
        barcoId: barco('demo_karla', 'DESTRUCTOR'),
        tipo: 'MEJORAR',
        ronda: 3,
        resultado: JSON.stringify({
          mejora: 'BLINDAJE',
          statMejorado: 'casco',
          valorNuevo: 4,
          costos: { chatarra: 3, acciones: 1 }}),
        ...fechas},
      {
        jugadorPartidaId: demo.jugador.demo_diego,
        barcoId: barco('demo_diego', 'LANCHA'),
        tipo: 'MOVER',
        ronda: 3,
        resultado: JSON.stringify({
          casillaDestino: { x: 6, y: 6 },
          casillaFinal: { x: 6, y: 6 },
          casillasRecorridas: 2,
          detenidoPor: 'DESTINO_ALCANZADO',
          costos: { combustible: 2, acciones: 1 }}),
        ...fechas},
      {
        jugadorPartidaId: demo.jugador.demo_karla,
        barcoId: barco('demo_karla', 'LANCHA'),
        tipo: 'MOVER',
        ronda: 4,
        resultado: JSON.stringify({
          casillaDestino: { x: 5, y: 4 },
          casillaFinal: { x: 5, y: 4 },
          casillasRecorridas: 1,
          detenidoPor: 'DESTINO_ALCANZADO',
          costos: { combustible: 1, acciones: 1 }}),
        ...fechas}]);
  },

  async down(queryInterface) {
    const demo = await buscarPartidaDemo(queryInterface);
    if (!demo) return;
    await queryInterface.bulkDelete('Barcos', { jugadorPartidaId: Object.values(demo.jugador) });
    await queryInterface.bulkDelete('Casillas', { partidaId: demo.partidaId });
  },
};
