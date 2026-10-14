const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Partida, JugadorPartida, Usuario } = require('../models');
const HttpError = require('../utils/HttpError');

const MINUTOS_LOBBY = 5;
const CARACTERES_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const TRANSICIONES = {
  LISTO_PARA_INICIAR: ['DESPLIEGUE'],
  DESPLIEGUE: ['EN_CURSO'],
  EN_CURSO: ['TERMINADA'],
};

const INCLUIR_JUGADORES = {
  model: Usuario,
  as: 'jugadores',
  attributes: ['id', 'username'],
  through: { attributes: ['rolPartida'] },
};

function validarId(id) {
  const partidaId = Number(id);

  if (!Number.isInteger(partidaId) || partidaId <= 0) {
    throw new HttpError(400, 'ID_INVALIDO', 'El ID debe ser un entero positivo.');
  }

  return partidaId;
}

function lobbyExpirado(partida) {
  return (
    partida.estado === 'ESPERANDO_JUGADOR' &&
    partida.expiraEn !== null &&
    partida.expiraEn < new Date()
  );
}

async function eliminarLobbiesExpirados(transaction) {
  await Partida.destroy({
    where: {
      modo: 'PRIVADA',
      estado: 'ESPERANDO_JUGADOR',
      expiraEn: { [Op.lt]: new Date() },
    },
    transaction,
  });
}

async function buscarPartidaActiva(usuarioId, transaction) {
  const participacion = await JugadorPartida.findOne({
    where: { usuarioId },
    include: [
      {
        model: Partida,
        as: 'partida',
        where: { estado: { [Op.ne]: 'TERMINADA' } },
      },
    ],
    transaction,
  });

  return participacion ? participacion.partida : null;
}

async function asegurarSinPartidaActiva(usuarioId, transaction) {
  const activa = await buscarPartidaActiva(usuarioId, transaction);

  if (activa) {
    throw new HttpError(
      409,
      'YA_ESTAS_EN_PARTIDA',
      'Ya estás en otra partida activa, tienes un lobby abierto o estás buscando rival.'
    );
  }
}

async function generarCodigoUnico(transaction) {
  for (let intento = 0; intento < 10; intento += 1) {
    let codigo = '';

    for (let i = 0; i < 6; i += 1) {
      codigo += CARACTERES_CODIGO[crypto.randomInt(CARACTERES_CODIGO.length)];
    }

    const existe = await Partida.findOne({ where: { codigoInvitacion: codigo }, transaction });

    if (!existe) {
      return codigo;
    }
  }

  throw new Error('No se pudo generar un código de invitación único.');
}

function obtenerConJugadores(partidaId, transaction) {
  return Partida.findByPk(partidaId, { include: [INCLUIR_JUGADORES], transaction });
}

async function posicionEnCola(partida, transaction) {
  return Partida.count({
    where: {
      modo: 'MATCHMAKING',
      estado: 'ESPERANDO_JUGADOR',
      createdAt: { [Op.lte]: partida.createdAt },
    },
    transaction,
  });
}

async function listarPartidas(filtros) {
  const where = {};

  if (filtros.estado !== undefined) {
    if (!Partida.ESTADOS.includes(filtros.estado)) {
      throw new HttpError(
        400,
        'FILTRO_INVALIDO',
        `El estado debe ser uno de: ${Partida.ESTADOS.join(', ')}.`
      );
    }
    where.estado = filtros.estado;
  }

  if (filtros.modo !== undefined) {
    if (!Partida.MODOS.includes(filtros.modo)) {
      throw new HttpError(
        400,
        'FILTRO_INVALIDO',
        `El modo debe ser uno de: ${Partida.MODOS.join(', ')}.`
      );
    }
    where.modo = filtros.modo;
  }

  await eliminarLobbiesExpirados();

  return Partida.findAll({
    where,
    include: [INCLUIR_JUGADORES],
    order: [['createdAt', 'DESC']],
  });
}

async function obtenerPartida(id, usuario) {
  const partida = await obtenerConJugadores(validarId(id));

  if (!partida || lobbyExpirado(partida)) {
    if (partida) {
      await partida.destroy();
    }
    throw new HttpError(404, 'PARTIDA_NO_EXISTE', 'No existe una partida con ese ID.');
  }

  const esJugador = partida.jugadores.some((jugador) => jugador.id === usuario.id);

  if (!esJugador && usuario.role !== 'Administrador') {
    throw new HttpError(403, 'NO_PERTENECES_A_LA_PARTIDA', 'No eres jugador de esta partida.');
  }

  return partida;
}

async function crearPartida(usuario) {
  return sequelize.transaction(async (transaction) => {
    await eliminarLobbiesExpirados(transaction);
    await asegurarSinPartidaActiva(usuario.id, transaction);

    const partida = await Partida.create(
      {
        modo: 'PRIVADA',
        codigoInvitacion: await generarCodigoUnico(transaction),
        expiraEn: new Date(Date.now() + MINUTOS_LOBBY * 60 * 1000),
      },
      { transaction }
    );

    await partida.addJugador(usuario, { through: { rolPartida: 'DUENO' }, transaction });

    return partida;
  });
}

async function unirsePorCodigo(codigo, usuario) {
  return sequelize.transaction(async (transaction) => {
    const partida = await Partida.findOne({
      where: { codigoInvitacion: String(codigo).trim().toUpperCase() },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!partida) {
      throw new HttpError(404, 'CODIGO_INVALIDO', 'El código no corresponde a ningún lobby.');
    }

    if (lobbyExpirado(partida)) {
      throw new HttpError(410, 'LOBBY_EXPIRADO', 'El lobby expiró sin que nadie se uniera.');
    }

    if (partida.estado !== 'ESPERANDO_JUGADOR') {
      throw new HttpError(409, 'PARTIDA_LLENA', 'El lobby ya tiene un invitado.');
    }

    await eliminarLobbiesExpirados(transaction);
    await asegurarSinPartidaActiva(usuario.id, transaction);

    await partida.addJugador(usuario, { through: { rolPartida: 'INVITADO' }, transaction });
    await partida.update({ estado: 'LISTO_PARA_INICIAR', expiraEn: null }, { transaction });

    return obtenerConJugadores(partida.id, transaction);
  });
}

async function buscarRival(usuario) {
  return sequelize.transaction(async (transaction) => {
    await eliminarLobbiesExpirados(transaction);

    const actual = await buscarPartidaActiva(usuario.id, transaction);
    const enCola = Boolean(
      actual && actual.modo === 'MATCHMAKING' && actual.estado === 'ESPERANDO_JUGADOR'
    );

    if (actual && !enCola) {
      if (actual.modo === 'MATCHMAKING' && actual.estado === 'DESPLIEGUE') {
        return { encontrado: true, partida: await obtenerConJugadores(actual.id, transaction) };
      }

      throw new HttpError(
        409,
        'YA_ESTAS_EN_PARTIDA',
        'Ya estás en una partida activa o tienes un lobby abierto.'
      );
    }

    const condicionRival = { modo: 'MATCHMAKING', estado: 'ESPERANDO_JUGADOR' };

    if (enCola) {
      condicionRival.createdAt = { [Op.lt]: actual.createdAt };
    }

    const rival = await Partida.findOne({
      where: condicionRival,
      order: [['createdAt', 'ASC']],
      lock: transaction.LOCK.UPDATE,
      skipLocked: true,
      transaction,
    });

    if (rival) {
      if (enCola) {
        await actual.destroy({ transaction });
      }

      await rival.addJugador(usuario, { transaction });
      await rival.update({ estado: 'DESPLIEGUE' }, { transaction });

      return { encontrado: true, partida: await obtenerConJugadores(rival.id, transaction) };
    }

    let partidaEnCola = actual;

    if (!enCola) {
      partidaEnCola = await Partida.create({ modo: 'MATCHMAKING' }, { transaction });
      await partidaEnCola.addJugador(usuario, { transaction });
    }

    return {
      encontrado: false,
      partidaId: partidaEnCola.id,
      posicionEnCola: await posicionEnCola(partidaEnCola, transaction),
    };
  });
}

async function actualizarPartida(id, datos, usuario) {
  const partida = await obtenerPartida(id, usuario);

  if (datos.estado === undefined) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', 'Debes enviar el nuevo estado de la partida.');
  }

  if (!Partida.ESTADOS.includes(datos.estado)) {
    throw new HttpError(
      400,
      'ESTADO_INVALIDO',
      `El estado debe ser uno de: ${Partida.ESTADOS.join(', ')}.`
    );
  }

  const permitidos = TRANSICIONES[partida.estado] || [];

  if (!permitidos.includes(datos.estado)) {
    throw new HttpError(
      409,
      'TRANSICION_INVALIDA',
      `No se puede pasar de ${partida.estado} a ${datos.estado}.`
    );
  }

  const cambios = { estado: datos.estado };

  if (datos.estado === 'TERMINADA') {
    cambios.terminadaEn = new Date();
  }

  await partida.update(cambios);

  return obtenerConJugadores(partida.id);
}

async function cancelarPartida(id, usuario) {
  const partida = await obtenerPartida(id, usuario);

  if (!['ESPERANDO_JUGADOR', 'LISTO_PARA_INICIAR'].includes(partida.estado)) {
    throw new HttpError(
      409,
      'PARTIDA_YA_INICIADA',
      'Solo se puede cancelar una partida que todavía no empieza.'
    );
  }

  const yo = partida.jugadores.find((jugador) => jugador.id === usuario.id);
  const esDueno = Boolean(yo && yo.JugadorPartida.rolPartida === 'DUENO');
  const esMatchmaking = partida.modo === 'MATCHMAKING';

  if (!esDueno && !esMatchmaking && usuario.role !== 'Administrador') {
    throw new HttpError(403, 'SOLO_EL_DUENO_PUEDE_CANCELAR', 'Solo el dueño puede cancelar la partida.');
  }

  await partida.destroy();
}

module.exports = {
  listarPartidas,
  obtenerPartida,
  crearPartida,
  unirsePorCodigo,
  buscarRival,
  actualizarPartida,
  cancelarPartida,
};