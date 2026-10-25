const { Partida, JugadorPartida, EventoPartida } = require('../models');
const HttpError = require('../utils/HttpError');
const { validarId } = require('../utils/validaciones');
const { CARTAS_EVENTO } = require('../config/reglas');

async function verificarAcceso(partidaId, usuario) {
  const partida = await Partida.findByPk(partidaId);
  if (!partida) {
    throw new HttpError(404, 'PARTIDA_NO_EXISTE', 'No existe una partida con ese ID.');
  }

  if (usuario.role !== 'Administrador') {
    const jugador = await JugadorPartida.findOne({ where: { partidaId, usuarioId: usuario.id } });
    if (!jugador) {
      throw new HttpError(403, 'NO_PERTENECES_A_LA_PARTIDA', 'No eres jugador de esta partida.');
    }
  }

  return partida;
}

// solo admin puede crear o modificar las cartas
function exigirAdministrador(usuario) {
  if (usuario.role !== 'Administrador') {
    throw new HttpError(403, 'SOLO_ADMINISTRADOR', 'Solo un administrador puede crear, modificar o eliminar eventos.');
  }
}

async function buscarEvento(partidaId, eventoId) {
  const evento = await EventoPartida.findOne({ where: { id: eventoId, partidaId } });
  if (!evento) {
    throw new HttpError(404, 'EVENTO_NO_EXISTE', 'No existe un evento con ese ID en esta partida.');
  }
  return evento;
}

async function listarEventos(id, usuario) {
  const partidaId = validarId(id);
  await verificarAcceso(partidaId, usuario);

  return EventoPartida.findAll({ where: { partidaId }, order: [['ronda', 'ASC']] });
}

async function obtenerEvento(id, eventoId, usuario) {
  const partidaId = validarId(id);
  const idEvento = validarId(eventoId);
  await verificarAcceso(partidaId, usuario);

  return buscarEvento(partidaId, idEvento);
}

async function crearEvento(id, usuario, datos) {
  const partidaId = validarId(id);
  exigirAdministrador(usuario);
  await verificarAcceso(partidaId, usuario);

  if (datos.ronda === undefined || datos.tipoCarta === undefined) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', 'Debes enviar ronda y tipoCarta.');
  }

  return EventoPartida.create({
    partidaId,
    ronda: datos.ronda,
    tipoCarta: datos.tipoCarta,
    descripcion: datos.descripcion || CARTAS_EVENTO[datos.tipoCarta] || 'Sin descripción.'});
}

async function actualizarEvento(id, eventoId, usuario, datos) {
  const partidaId = validarId(id);
  const idEvento = validarId(eventoId);
  exigirAdministrador(usuario);
  await verificarAcceso(partidaId, usuario);
  const evento = await buscarEvento(partidaId, idEvento);

  if (datos.tipoCarta === undefined && datos.descripcion === undefined) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', 'Debes enviar tipoCarta o descripcion para actualizar.');
  }

  const cambios = {};
  if (datos.tipoCarta !== undefined) {
    cambios.tipoCarta = datos.tipoCarta;
    cambios.descripcion = CARTAS_EVENTO[datos.tipoCarta] || evento.descripcion;
  }
  if (datos.descripcion !== undefined) {
    cambios.descripcion = datos.descripcion;
  }

  await evento.update(cambios);
  return evento;
}

async function eliminarEvento(id, eventoId, usuario) {
  const partidaId = validarId(id);
  const idEvento = validarId(eventoId);
  exigirAdministrador(usuario);
  await verificarAcceso(partidaId, usuario);
  const evento = await buscarEvento(partidaId, idEvento);

  await evento.destroy();
}

module.exports = {
  listarEventos,
  obtenerEvento,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
};
