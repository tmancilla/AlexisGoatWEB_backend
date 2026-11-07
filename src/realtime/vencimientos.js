const { Op } = require('sequelize');
const { Partida } = require('../models');
const { resolverDespliegueVencido } = require('../services/despliegue.service');
const { resolverTurnoVencido } = require('../services/turno.service');
const { avisarCambio, usuariosDePartida } = require('./socket');

const SEGUNDOS_REVISION = 5;

const RESOLVER_SEGUN_ESTADO = {
  DESPLIEGUE: { resolver: resolverDespliegueVencido, motivo: 'DESPLIEGUE_VENCIDO' },
  EN_CURSO: { resolver: resolverTurnoVencido, motivo: 'TURNO_VENCIDO' },
};

let revisando = false;

async function resolverPartidasVencidas() {
  const vencidas = await Partida.findAll({
    where: { estado: Object.keys(RESOLVER_SEGUN_ESTADO), expiraEn: { [Op.lt]: new Date() } },
    attributes: ['id', 'estado'],
  });

  for (const partida of vencidas) {
    const { resolver, motivo } = RESOLVER_SEGUN_ESTADO[partida.estado];
    try {
      if (await resolver(partida.id)) await avisarCambio(partida.id, motivo);
    } catch (error) {
      console.error(`No se pudo resolver el vencimiento de la partida ${partida.id}:`, error);
    }
  }
}

async function cerrarLobbiesExpirados() {
  const expirados = await Partida.findAll({
    where: { modo: 'PRIVADA', estado: 'ESPERANDO_JUGADOR', expiraEn: { [Op.lt]: new Date() } },
    attributes: ['id'],
  });

  for (const lobby of expirados) {
    const usuarios = await usuariosDePartida(lobby.id);
    const borrados = await Partida.destroy({ where: { id: lobby.id, estado: 'ESPERANDO_JUGADOR' } });
    if (borrados > 0) await avisarCambio(lobby.id, 'LOBBY_EXPIRADO', { lobby: true, usuarios });
  }
}

async function revisarVencimientos() {
  if (revisando) return;
  revisando = true;
  try {
    await resolverPartidasVencidas();
    await cerrarLobbiesExpirados();
  } catch (error) {
    console.error('Error al revisar vencimientos:', error);
  } finally {
    revisando = false;
  }
}

function iniciarVencimientos() {
  return setInterval(revisarVencimientos, SEGUNDOS_REVISION * 1000);
}

module.exports = {
  iniciarVencimientos,
  revisarVencimientos,
};