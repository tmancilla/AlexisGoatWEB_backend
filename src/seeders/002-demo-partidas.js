const bcrypt = require('bcrypt');
const { BARCOS, CARTAS_EVENTO } = require('../config/reglas');

const USUARIOS = [
  'demo_dueno',
  'demo_libre1',
  'demo_libre2',
  'demo_ana',
  'demo_beto',
  'demo_karla',
  'demo_diego',
  'demo_elena',
  'demo_fede',
];


const ESPECIALES_DEMO = [
  { x: 2, y: 4, tipo: 'POZO_PETROLERO' },
  { x: 6, y: 5, tipo: 'POZO_PETROLERO' },
  { x: 9, y: 7, tipo: 'POZO_PETROLERO' },
  { x: 4, y: 4, tipo: 'DEPOSITO_MUNICION' },
  { x: 8, y: 6, tipo: 'DEPOSITO_MUNICION' },
  { x: 1, y: 7, tipo: 'DEPOSITO_MUNICION' },
  { x: 7, y: 4, tipo: 'NAUFRAGIO' },
  { x: 3, y: 6, tipo: 'NAUFRAGIO' },
  { x: 10, y: 5, tipo: 'NAUFRAGIO' },
  { x: 5, y: 2, tipo: 'CORRIENTE_PELIGROSA' },
  { x: 9, y: 3, tipo: 'CORRIENTE_PELIGROSA' },
  { x: 2, y: 9, tipo: 'CORRIENTE_PELIGROSA' },
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
        password: bcrypt.hashSync('123456', 10),
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
          createdAt: haceMinutos(25),
          updatedAt: haceMinutos(1),
        }),
        partida({
          codigoInvitacion: 'MAPA24',
          estado: 'TERMINADA',
          modo: 'PRIVADA',
          rondaActual: 20,
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

    const participaciones = await queryInterface.bulkInsert('JugadoresPartida', [
      jugador(lobby.id, 'demo_dueno', { rolPartida: 'DUENO', numeroJugador: 1 }),

      jugador(listo.id, 'demo_ana', { rolPartida: 'DUENO', numeroJugador: 1 }),
      jugador(listo.id, 'demo_beto', { rolPartida: 'INVITADO', numeroJugador: 2 }),

      jugador(enCurso.id, 'demo_karla', {
        numeroJugador: 1,
        combustible: 9,
        municion: 6,
        chatarra: 4,
        accionesRestantes: 2,
        listo: true,
      }),
      jugador(enCurso.id, 'demo_diego', {
        numeroJugador: 2,
        combustible: 7,
        municion: 5,
        chatarra: 3,
        listo: true,
      }),

      jugador(terminada.id, 'demo_elena', {
        rolPartida: 'DUENO',
        numeroJugador: 1,
        combustible: 4,
        municion: 2,
        chatarra: 6,
        accionesRestantes: 0,
        listo: true,
        puntajeFinal: 45,
      }),
      jugador(terminada.id, 'demo_fede', {
        rolPartida: 'INVITADO',
        numeroJugador: 2,
        combustible: 1,
        municion: 0,
        chatarra: 2,
        accionesRestantes: 0,
        listo: true,
        puntajeFinal: 30,
      }),
    ], { returning: true });

    const participacion = (partidaId, username) =>
      participaciones.find((p) => p.partidaId === partidaId && p.usuarioId === id[username]).id;

    await queryInterface.bulkUpdate(
      'Partidas',
      {
        turnoActualId: participacion(enCurso.id, 'demo_karla'),
        jugadorInicialId: participacion(enCurso.id, 'demo_karla'),
      },
      { id: enCurso.id }
    );

    await queryInterface.bulkUpdate(
      'Partidas',
      {
        ganadorId: participacion(terminada.id, 'demo_elena'),
        jugadorInicialId: participacion(terminada.id, 'demo_elena'),
        motivoFin: 'FLOTA_DESTRUIDA',
      },
      { id: terminada.id }
    );

    const tablero = (partidaId, agotadas = []) => {
      const casillas = [];

      for (let y = 1; y <= 10; y += 1) {
        for (let x = 1; x <= 10; x += 1) {
          const especial = ESPECIALES_DEMO.find((c) => c.x === x && c.y === y);

          casillas.push({
            partidaId,
            x,
            y,
            tipo: especial ? especial.tipo : 'AGUA_ABIERTA',
            agotada: agotadas.some((c) => c.x === x && c.y === y),
            createdAt: ahora,
            updatedAt: ahora,
          });
        }
      }

      return casillas;
    };

    await queryInterface.bulkInsert('Casillas', [
      ...tablero(terminada.id, [{ x: 7, y: 4 }, { x: 3, y: 6 }]),
    ]);

    const barco = (partidaId, username, tipo, x, y, datos = {}) => ({
      jugadorPartidaId: participacion(partidaId, username),
      tipo,
      x,
      y,
      cascoActual: BARCOS[tipo].casco,
      cascoMaximo: BARCOS[tipo].casco,
      movimiento: BARCOS[tipo].movimiento,
      alcance: BARCOS[tipo].alcance,
      deteccion: BARCOS[tipo].deteccion,
      aFlote: true,
      createdAt: ahora,
      updatedAt: ahora,
      ...datos,
    });

    const hundido = { cascoActual: 0, aFlote: false };

    await queryInterface.bulkInsert('Barcos', [
      barco(terminada.id, 'demo_elena', 'LANCHA', 5, 6, hundido),
      barco(terminada.id, 'demo_elena', 'FRAGATA', 6, 7, { cascoActual: 1 }),
      barco(terminada.id, 'demo_elena', 'DESTRUCTOR', 7, 7),
      barco(terminada.id, 'demo_elena', 'ACORAZADO', 4, 5, { cascoActual: 2 }),
      barco(terminada.id, 'demo_fede', 'LANCHA', 8, 8, hundido),
      barco(terminada.id, 'demo_fede', 'FRAGATA', 6, 9, hundido),
      barco(terminada.id, 'demo_fede', 'DESTRUCTOR', 7, 9, hundido),
      barco(terminada.id, 'demo_fede', 'ACORAZADO', 9, 8, hundido),
    ]);

    const evento = (partidaId, ronda, tipoCarta) => ({
      partidaId,
      ronda,
      tipoCarta,
      descripcion: CARTAS_EVENTO[tipoCarta],
      createdAt: ahora,
      updatedAt: ahora,
    });

    await queryInterface.bulkInsert('EventosPartida', [
      evento(enCurso.id, 1, 'MAREA_ALTA'),
      evento(enCurso.id, 2, 'SABOTAJE'),
      evento(enCurso.id, 3, 'BOTIN_FLOTANTE'),
      evento(enCurso.id, 4, 'TORMENTA'),
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