const { Accion, CatalogoMejora, MejoraBarco } = require('../models');
const HttpError = require('../utils/HttpError');

function validarMejora(datos) {
  if (datos.mejora === undefined) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', 'Para mejorar debes enviar mejora.');
  }

  if (typeof datos.mejora !== 'string' || datos.mejora.trim() === '') {
    throw new HttpError(400, 'MEJORA_INVALIDA', 'Debes indicar el nombre de una mejora.');
  }
}

async function mejorar(partida, jugador, barco, datos, transaction) {
  const mejora = await CatalogoMejora.findOne({
    where: { nombre: datos.mejora },
    transaction,
  });

  if (!mejora) {
    throw new HttpError(400, 'MEJORA_INVALIDA', 'La mejora indicada no existe en el catálogo.');
  }

  const instaladas = await MejoraBarco.findAll({
    where: { barcoId: barco.id },
    transaction,
  });

  if (instaladas.some((instalada) => instalada.catalogoMejoraId === mejora.id)) {
    throw new HttpError(422, 'MEJORA_REPETIDA', 'Este barco ya tiene esa mejora.');
  }

  if (instaladas.length >= 2) {
    throw new HttpError(422, 'LIMITE_MEJORAS', 'Este barco ya tiene dos mejoras.');
  }

  if (jugador.chatarra < mejora.costoChatarra) {
    throw new HttpError(422, 'CHATARRA_INSUFICIENTE', `Necesitas ${mejora.costoChatarra} de chatarra para comprar esta mejora.`);
  }

  const campo = mejora.atributo === 'casco' ? 'cascoActual' : mejora.atributo;
  const valorNuevo = barco[campo] + mejora.incremento;
  const cambios = { [campo]: valorNuevo };

  if (mejora.atributo === 'casco') {
    cambios.cascoMaximo = barco.cascoMaximo + mejora.incremento;
  }

  await barco.update(cambios, { transaction });

  await MejoraBarco.create({
    barcoId: barco.id,
    catalogoMejoraId: mejora.id,
    rondaAdquirida: partida.rondaActual,
  }, { transaction });

  await jugador.update({
    chatarra: jugador.chatarra - mejora.costoChatarra,
    accionesRestantes: jugador.accionesRestantes - 1,
  }, { transaction });

  const resultado = {
    mejora: mejora.nombre,
    statMejorado: mejora.atributo,
    valorNuevo,
  };
  const costos = { chatarra: mejora.costoChatarra, acciones: 1 };

  await Accion.create({
    jugadorPartidaId: jugador.id,
    barcoId: barco.id,
    tipo: 'MEJORAR',
    ronda: partida.rondaActual,
    resultado: { ...resultado, costos },
  }, { transaction });

  return {
    tipoAccion: 'MEJORAR',
    barcoId: barco.id,
    resultado,
    costos,
    accionesRestantes: jugador.accionesRestantes,
  };
}

module.exports = { validarMejora, mejorar };