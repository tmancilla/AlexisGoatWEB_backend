const http = require('http');
const request = require('supertest');
const { io: conectar } = require('socket.io-client');
const app = require('../src/app');
const { iniciarSocket } = require('../src/realtime/socket');
const { Usuario, Partida, JugadorPartida, sequelize } = require('../src/models');
const tokenDe = require('./helpers/tokenDe');

const MS_ESPERA = 3000;

let servidor;
let servidorSocket;
let url;
let api;
let usuarioUno;
let usuarioDos;
let intruso;
let partida;
const clientes = [];

async function crearUsuario(username) {
  return Usuario.create({
    username,
    email: `${username}@example.com`,
    password: 'ClaveSocket123',
    role: 'Jugador',
  });
}

function nuevoCliente(token) {
  const cliente = conectar(url, { auth: { token }, transports: ['websocket'], reconnection: false });
  clientes.push(cliente);
  return cliente;
}

function esperarEvento(cliente, evento) {
  return new Promise((resolver, rechazar) => {
    const plazo = setTimeout(() => rechazar(new Error(`No llegó ${evento}`)), MS_ESPERA);
    cliente.once(evento, (datos) => {
      clearTimeout(plazo);
      resolver(datos);
    });
  });
}

async function conectado(usuario) {
  const cliente = nuevoCliente(tokenDe(usuario));
  await esperarEvento(cliente, 'connect');
  return cliente;
}

function unirse(cliente, partidaId) {
  return cliente.timeout(MS_ESPERA).emitWithAck('partida:unirse', { partidaId });
}

beforeAll(async () => {
  sequelize.options.logging = false;

  servidor = http.createServer(app.callback());
  servidorSocket = iniciarSocket(servidor);
  await new Promise((resolver) => { servidor.listen(0, resolver); });
  url = `http://localhost:${servidor.address().port}`;
  api = request(servidor);

  usuarioUno = await crearUsuario('test_socket_uno');
  usuarioDos = await crearUsuario('test_socket_dos');
  intruso = await crearUsuario('test_socket_intruso');
});

beforeEach(async () => {
  partida = await Partida.create({ modo: 'MATCHMAKING', estado: 'EN_CURSO', rondaActual: 1 });
  const uno = await JugadorPartida.create({ partidaId: partida.id, usuarioId: usuarioUno.id, numeroJugador: 1, listo: true });
  await JugadorPartida.create({ partidaId: partida.id, usuarioId: usuarioDos.id, numeroJugador: 2, listo: true });
  await partida.update({ turnoActualId: uno.id, jugadorInicialId: uno.id });
});

afterEach(() => {
  clientes.splice(0).forEach((cliente) => cliente.disconnect());
});

afterAll(async () => {
  await servidorSocket.close();
  await sequelize.close();
});

describe('Conexión por socket', () => {
  test('rechaza la conexión sin un token válido', async () => {
    const cliente = nuevoCliente('token-falso');

    const error = await esperarEvento(cliente, 'connect_error');

    expect(error.message).toBe('TOKEN_INVALIDO');
  });

  test('un jugador de la partida entra a su sala', async () => {
    const cliente = await conectado(usuarioUno);

    const respuesta = await unirse(cliente, partida.id);

    expect(respuesta).toEqual({ ok: true, partidaId: partida.id });
  });

  test('alguien que no juega la partida no puede entrar a su sala', async () => {
    const cliente = await conectado(intruso);

    const respuesta = await unirse(cliente, partida.id);

    expect(respuesta).toMatchObject({ ok: false, codigo: 'NO_PERTENECES_A_LA_PARTIDA' });
  });

  test('una partida que no existe se rechaza', async () => {
    const cliente = await conectado(usuarioUno);

    const respuesta = await unirse(cliente, 999999);

    expect(respuesta).toMatchObject({ ok: false, codigo: 'PARTIDA_NO_EXISTE' });
  });
});

describe('Avisos de la partida', () => {
  test('al terminar el turno el rival recibe partida:actualizada', async () => {
    const rival = await conectado(usuarioDos);
    await unirse(rival, partida.id);
    const aviso = esperarEvento(rival, 'partida:actualizada');

    await api
      .post(`/games/${partida.id}/terminar-turno`)
      .set('Authorization', `Bearer ${tokenDe(usuarioUno)}`)
      .expect(200);

    expect(await aviso).toEqual({ partidaId: partida.id, motivo: 'TURNO_TERMINADO' });
  });

  test('al abandonar el rival recibe partida:terminada con su id como ganador', async () => {
    const rival = await conectado(usuarioDos);
    await unirse(rival, partida.id);
    const aviso = esperarEvento(rival, 'partida:terminada');

    await api
      .post(`/games/${partida.id}/abandonar`)
      .set('Authorization', `Bearer ${tokenDe(usuarioUno)}`)
      .expect(200);

    expect(await aviso).toEqual({ partidaId: partida.id, motivo: 'ABANDONO', ganador: usuarioDos.id });
  });

  test('una jugada rechazada no manda aviso', async () => {
    const rival = await conectado(usuarioDos);
    await unirse(rival, partida.id);
    const recibidos = [];
    rival.on('partida:actualizada', (datos) => recibidos.push(datos));

    await api
      .post(`/games/${partida.id}/terminar-turno`)
      .set('Authorization', `Bearer ${tokenDe(usuarioDos)}`)
      .expect(422);
    await new Promise((resolver) => { setTimeout(resolver, 300); });

    expect(recibidos).toEqual([]);
  });
});