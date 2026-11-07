const { Server } = require('socket.io');
const { Partida, JugadorPartida, Usuario } = require('../models');
const { verificarToken } = require('../utils/token');

let io = null;

function salaUsuario(usuarioId) {
  return `usuario:${usuarioId}`;
}

function salaPartida(partidaId) {
  return `partida:${partidaId}`;
}

function socketActivo() {
  return io !== null;
}

async function usuariosDePartida(partidaId) {
  const jugadores = await JugadorPartida.findAll({ where: { partidaId }, attributes: ['usuarioId'] });
  return jugadores.map((jugador) => jugador.usuarioId);
}


async function autenticarSocket(socket, next) {
  try {
    const datos = verificarToken(socket.handshake.auth?.token);
    const usuario = await Usuario.findByPk(datos.id, { attributes: ['id', 'username', 'role'] });
    if (!usuario) throw new Error('El usuario del token ya no existe.');

    socket.data.usuario = usuario;
    next();
  } catch {
    next(new Error('TOKEN_INVALIDO'));
  }
}

async function unirseAPartida(socket, datos, responder) {
  const { usuario } = socket.data;
  const partidaId = Number(datos?.partidaId);

  if (!Number.isInteger(partidaId) || partidaId <= 0) {
    return responder({ ok: false, codigo: 'ID_INVALIDO', mensaje: 'partidaId debe ser un entero positivo.' });
  }

  const partida = await Partida.findByPk(partidaId, { attributes: ['id'] });
  if (!partida) {
    return responder({ ok: false, codigo: 'PARTIDA_NO_EXISTE', mensaje: 'No existe una partida con ese ID.' });
  }

  // igual que GET /games/:id: entran sus jugadores y el administrador, que puede auditar cualquier partida
  const esJugador = await JugadorPartida.count({ where: { partidaId, usuarioId: usuario.id } });
  if (!esJugador && usuario.role !== 'Administrador') {
    return responder({ ok: false, codigo: 'NO_PERTENECES_A_LA_PARTIDA', mensaje: 'No eres jugador de esta partida.' });
  }

  socket.join(salaPartida(partidaId));
  return responder({ ok: true, partidaId });
}

function registrarConexion(socket) {
  const { usuario } = socket.data;
  socket.join(salaUsuario(usuario.id));

  socket.on('partida:unirse', async (datos, ack) => {
    const responder = typeof ack === 'function' ? ack : () => {};
    try {
      await unirseAPartida(socket, datos, responder);
    } catch (error) {
      console.error('Error en partida:unirse:', error);
      responder({ ok: false, codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor.' });
    }
  });

  socket.on('partida:salir', (datos, ack) => {
    socket.leave(salaPartida(Number(datos?.partidaId)));
    if (typeof ack === 'function') ack({ ok: true });
  });
}

function iniciarSocket(servidorHttp) {
  io = new Server(servidorHttp, { cors: { origin: process.env.FRONTEND_URL } });
  io.use(autenticarSocket);
  io.on('connection', registrarConexion);
  return io;
}

async function avisarCambio(partidaId, motivo, { lobby = false, usuarios = [] } = {}) {
  if (!io) return;

  const partida = await Partida.findByPk(partidaId, { attributes: ['id', 'estado', 'motivoFin', 'ganadorId'] });
  const destinatarios = [...new Set([...usuarios, ...(partida ? await usuariosDePartida(partidaId) : [])])];
  const salasUsuarios = destinatarios.map(salaUsuario);

  io.to(salaPartida(partidaId)).emit('partida:actualizada', { partidaId, motivo });

  if (lobby && salasUsuarios.length > 0) {
    io.to(salasUsuarios).emit('lobby:actualizado', { partidaId, motivo });
  }

  if (partida && partida.estado === 'TERMINADA') {
    const ganador = partida.ganadorId ? await JugadorPartida.findByPk(partida.ganadorId, { attributes: ['usuarioId'] }) : null;
    io.to([salaPartida(partidaId), ...salasUsuarios]).emit('partida:terminada', {
      partidaId,
      motivo: partida.motivoFin,
      ganador: ganador ? ganador.usuarioId : null,
    });
  }
}

module.exports = {
  iniciarSocket,
  socketActivo,
  usuariosDePartida,
  avisarCambio,
};