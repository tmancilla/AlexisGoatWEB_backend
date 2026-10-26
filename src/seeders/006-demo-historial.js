async function buscarPartida(queryInterface, usernames, estado) {
  const [filas] = await queryInterface.sequelize.query(
    `SELECT jp.id AS "jugadorPartidaId", jp."partidaId", u.username, b.id AS "barcoId", b.tipo
     FROM "JugadoresPartida" jp
     JOIN "Usuarios" u ON u.id = jp."usuarioId"
     JOIN "Partidas" p ON p.id = jp."partidaId"
     LEFT JOIN "Barcos" b ON b."jugadorPartidaId" = jp.id
     WHERE u.username IN (:usernames) AND p.estado = :estado`,
    { replacements: { usernames, estado } });
  if (!filas.some((fila) => fila.barcoId)) return null;

  const jugador = Object.fromEntries(filas.map((fila) => [fila.username, fila.jugadorPartidaId]));
  const barco = (username, tipo) => {
    const fila = filas.find((f) => f.username === username && f.tipo === tipo);
    return fila ? fila.barcoId : null;
  };
  return { jugador, barco, barcos: filas.map((fila) => fila.barcoId).filter(Boolean) };
}

function fechas() {
  const ahora = new Date();
  return { createdAt: ahora, updatedAt: ahora };
}

function combate(atacanteId, defensorId, ronda, datos) {
  return { atacanteId, defensorId, ronda, dadoAtacante: null, dadoDefensor: null, ...datos, ...fechas() };
}

function accion(jugadorPartidaId, barcoId, tipo, ronda, resultado) {
  return { jugadorPartidaId, barcoId, tipo, ronda, resultado: JSON.stringify(resultado), ...fechas() };
}

module.exports = {
  async up(queryInterface) {
    const terminada = await buscarPartida(queryInterface, ['demo_elena', 'demo_fede'], 'TERMINADA');
    if (terminada) {
      const e = (tipo) => terminada.barco('demo_elena', tipo);
      const f = (tipo) => terminada.barco('demo_fede', tipo);

      await queryInterface.bulkInsert('Combates', [
        combate(f('FRAGATA'), e('DESTRUCTOR'), 8, { tipo: 'DISTANCIA', impacto: false }),
        combate(e('ACORAZADO'), f('FRAGATA'), 9, { tipo: 'DISTANCIA', impacto: true }),
        combate(f('LANCHA'), e('LANCHA'), 11, { tipo: 'CUERPO_A_CUERPO', dadoAtacante: 3, dadoDefensor: 2, impacto: true }),
        combate(f('ACORAZADO'), e('ACORAZADO'), 14, { tipo: 'DISTANCIA', impacto: true }),
        combate(e('DESTRUCTOR'), f('LANCHA'), 16, { tipo: 'CUERPO_A_CUERPO', dadoAtacante: 7, dadoDefensor: 3, impacto: true }),
        combate(f('DESTRUCTOR'), e('FRAGATA'), 17, { tipo: 'DISTANCIA', impacto: true }),
        combate(e('DESTRUCTOR'), f('DESTRUCTOR'), 19, { tipo: 'CUERPO_A_CUERPO', dadoAtacante: 6, dadoDefensor: 5, impacto: true }),
        combate(f('ACORAZADO'), e('FRAGATA'), 20, { tipo: 'CUERPO_A_CUERPO', dadoAtacante: 4, dadoDefensor: 6, impacto: false })]);

      await queryInterface.bulkInsert('Acciones', [
        accion(terminada.jugador.demo_elena, e('ACORAZADO'), 'DISPARAR', 9, {
          casillaObjetivo: { x: 6, y: 9 },
          impacto: true,
          hundido: true,
          cascoRestante: 0,
          costos: { municion: 2, acciones: 1 }}),
        accion(terminada.jugador.demo_elena, e('DESTRUCTOR'), 'MOVER', 19, {
          casillaDestino: { x: 7, y: 7 },
          casillaFinal: { x: 7, y: 7 },
          casillasRecorridas: 1,
          detenidoPor: 'DESTINO_ALCANZADO',
          costos: { combustible: 2, acciones: 1 }}),
        accion(terminada.jugador.demo_elena, e('FRAGATA'), 'MOVER', 20, {
          casillaDestino: { x: 6, y: 7 },
          casillaFinal: { x: 6, y: 7 },
          casillasRecorridas: 2,
          detenidoPor: 'DESTINO_ALCANZADO',
          costos: { combustible: 2, acciones: 1 }}),
        accion(terminada.jugador.demo_fede, f('ACORAZADO'), 'MOVER', 20, {
          casillaDestino: { x: 9, y: 8 },
          casillaFinal: { x: 9, y: 8 },
          casillasRecorridas: 1,
          detenidoPor: 'DESTINO_ALCANZADO',
          costos: { combustible: 2, acciones: 1 }})]);
    }

    const enCurso = await buscarPartida(queryInterface, ['demo_karla', 'demo_diego'], 'EN_CURSO');
    if (enCurso) {
      await queryInterface.bulkInsert('Combates', [
        combate(enCurso.barco('demo_karla', 'DESTRUCTOR'), enCurso.barco('demo_diego', 'DESTRUCTOR'), 3, { tipo: 'DISTANCIA', impacto: true })]);
      await queryInterface.bulkInsert('Acciones', [
        accion(enCurso.jugador.demo_karla, enCurso.barco('demo_karla', 'DESTRUCTOR'), 'DISPARAR', 3, {
          casillaObjetivo: { x: 3, y: 8 },
          impacto: true,
          hundido: false,
          cascoRestante: 2,
          costos: { municion: 1, acciones: 1 }})]);
    }
  },

  async down(queryInterface) {
    const terminada = await buscarPartida(queryInterface, ['demo_elena', 'demo_fede'], 'TERMINADA');
    const enCurso = await buscarPartida(queryInterface, ['demo_karla', 'demo_diego'], 'EN_CURSO');
    const barcos = [...(terminada ? terminada.barcos : []), ...(enCurso ? enCurso.barcos : [])];
    if (barcos.length) await queryInterface.bulkDelete('Combates', { atacanteId: barcos });
    if (terminada) await queryInterface.bulkDelete('Acciones', { jugadorPartidaId: Object.values(terminada.jugador) });
    if (enCurso) await queryInterface.bulkDelete('Acciones', { jugadorPartidaId: enCurso.jugador.demo_karla, tipo: 'DISPARAR' });
  },
};
