const USUARIOS = [
  'demo_dueno',
  'demo_libre1',
  'demo_libre2',
  'demo_ana',
  'demo_beto',
  'demo_carla',
  'demo_diego',
  'demo_elena',
  'demo_fede',
];

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    const haceMinutos = (minutos) => new Date(ahora.getTime() - minutos * 60 * 1000);

    const usuarios = await queryInterface.bulkInsert(
      'Usuarios',
      USUARIOS.map((username) => ({
        username,
        email: `${username}@demo.cl`,
        password: '123456',
        role: 'Jugador',
        createdAt: ahora,
        updatedAt: ahora,
      })),
      { returning: true }
    );

    const id = Object.fromEntries(usuarios.map((usuario) => [usuario.username, usuario.id]));

    const partida = (datos) => ({
      codigoInvitacion: null,
      rondaActual: 0,
      maxRondas: 20,
      turnoActualId: null,
      ganadorId: null,
      expiraEn: null,
      terminadaEn: null,
      ...datos,
    });

    const [lobby, listo, enCurso, terminada] = await queryInterface.bulkInsert(
      'Partidas',
      [
        partida({
          codigoInvitacion: 'PRAT22',
          estado: 'ESPERANDO_JUGADOR',
          modo: 'PRIVADA',
          createdAt: haceMinutos(2),
          updatedAt: haceMinutos(2),
        }),
        partida({
          codigoInvitacion: 'GRAU23',
          estado: 'LISTO_PARA_INICIAR',
          modo: 'PRIVADA',
          createdAt: haceMinutos(5),
          updatedAt: haceMinutos(4),
        }),
        partida({
          estado: 'EN_CURSO',
          modo: 'MATCHMAKING',
          rondaActual: 4,
          turnoActualId: id.demo_carla,
          createdAt: haceMinutos(25),
          updatedAt: haceMinutos(1),
        }),
        partida({
          codigoInvitacion: 'MAPA24',
          estado: 'TERMINADA',
          modo: 'PRIVADA',
          rondaActual: 20,
          ganadorId: id.demo_elena,
          terminadaEn: haceMinutos(30),
          createdAt: haceMinutos(90),
          updatedAt: haceMinutos(30),
        }),
      ],
      { returning: true }
    );

    const jugador = (partidaId, username, datos = {}) => ({
      partidaId,
      usuarioId: id[username],
      rolPartida: null,
      combustible: 12,
      municion: 8,
      chatarra: 0,
      accionesRestantes: 3,
      listo: false,
      puntajeFinal: null,
      createdAt: ahora,
      updatedAt: ahora,
      ...datos,
    });

    await queryInterface.bulkInsert('JugadoresPartida', [
      jugador(lobby.id, 'demo_dueno', { rolPartida: 'DUENO' }),

      jugador(listo.id, 'demo_ana', { rolPartida: 'DUENO' }),
      jugador(listo.id, 'demo_beto', { rolPartida: 'INVITADO' }),

      jugador(enCurso.id, 'demo_carla', {
        combustible: 9,
        municion: 6,
        chatarra: 4,
        accionesRestantes: 2,
        listo: true,
      }),
      jugador(enCurso.id, 'demo_diego', {
        combustible: 7,
        municion: 5,
        chatarra: 3,
        listo: true,
      }),

      jugador(terminada.id, 'demo_elena', {
        rolPartida: 'DUENO',
        combustible: 4,
        municion: 2,
        chatarra: 6,
        accionesRestantes: 0,
        listo: true,
        puntajeFinal: 45,
      }),
      jugador(terminada.id, 'demo_fede', {
        rolPartida: 'INVITADO',
        combustible: 1,
        municion: 0,
        chatarra: 2,
        accionesRestantes: 0,
        listo: true,
        puntajeFinal: 30,
      }),
    ]);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM "Partidas"
       WHERE id IN (
         SELECT jp."partidaId"
         FROM "JugadoresPartida" jp
         JOIN "Usuarios" u ON u.id = jp."usuarioId"
         WHERE u.username IN (:usernames)
       )`,
      { replacements: { usernames: USUARIOS } }
    );

    await queryInterface.bulkDelete('Usuarios', { username: USUARIOS });
  },
};