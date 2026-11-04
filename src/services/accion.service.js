const { sequelize, Partida, JugadorPartida, Barco, Casilla, CasillaRevelada, Accion } = require('../models');
const HttpError = require('../utils/HttpError');
const partidaService = require('./partida.service');
const { validarId } = require('../utils/validaciones');
const { clave, dentroDelTablero, distancia, casillasVistas, buscarRuta } = require('../utils/tablero');
const {
  BARCOS,
  TIPOS_ACCION,
  MAX_ACCIONES_POR_BARCO,
  RECOGIBLES} = require('../config/reglas');

function jugadaInvalida(codigo, mensaje) {
  return new HttpError(422, codigo, mensaje);
}

function validarCuerpo(datos) {
  if (!TIPOS_ACCION.includes(datos.tipoAccion)) {
    throw new HttpError(400, 'TIPO_ACCION_INVALIDO', `tipoAccion debe ser uno de: ${TIPOS_ACCION.join(', ')}.`);
  }
  const disponibles = Object.keys(ACCIONES);
  if (!disponibles.includes(datos.tipoAccion)) {
    throw jugadaInvalida('ACCION_NO_DISPONIBLE', `Por ahora solo se puede usar: ${disponibles.join(', ')}.`);
  }
  if (datos.barcoId === undefined) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', 'Debes enviar el barcoId del barco que hace la accion.');
  }
  ACCIONES[datos.tipoAccion].validar(datos);
}

function validarMover(datos) {
  if (!datos.casillaDestino) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', 'Para mover debes enviar casillaDestino.');
  }
  if (!dentroDelTablero(datos.casillaDestino)) {
    throw new HttpError(400, 'FUERA_DEL_TABLERO', 'La casilla de destino debe tener x e y enteros entre 1 y 10.');
  }
}

async function barcosAFlote(partidaId, transaction) {
  return Barco.findAll({
    where: { aFlote: true },
    include: [{ association: 'jugadorPartida', where: { partidaId }, attributes: [] }],
    transaction});
}

async function mover(partida, jugador, barco, datos, transaction) {
  const destino = datos.casillaDestino;
  const costoPorCasilla = BARCOS[barco.tipo].combustiblePorCasilla;
  if (jugador.combustible < costoPorCasilla) {
    throw jugadaInvalida('COMBUSTIBLE_INSUFICIENTE', `Necesitas al menos ${costoPorCasilla} de combustible para mover este barco y tienes ${jugador.combustible}.`);
  }

  const pasos = distancia(barco, destino);
  if (pasos === 0) {
    throw jugadaInvalida('DESTINO_INVALIDO', 'El destino debe ser distinto de la casilla donde esta el barco.');
  }
  if (pasos > barco.movimiento) {
    throw jugadaInvalida('FUERA_DE_MOVIMIENTO', `El destino esta a ${pasos} casillas y este barco mueve ${barco.movimiento}.`);
  }
  if (pasos * costoPorCasilla > jugador.combustible) {
    throw jugadaInvalida('COMBUSTIBLE_INSUFICIENTE', `Necesitas ${pasos * costoPorCasilla} de combustible y tienes ${jugador.combustible}.`);
  }

  const barcos = await barcosAFlote(partida.id, transaction);
  const propios = barcos.filter((otro) => otro.jugadorPartidaId === jugador.id);
  const enemigos = barcos.filter((otro) => otro.jugadorPartidaId !== jugador.id);
  const vistas = casillasVistas(propios);
  const bloqueadas = new Set(propios
    .filter((otro) => otro.id !== barco.id)
    .concat(enemigos.filter((enemigo) => vistas.has(clave(enemigo))))
    .map(clave));

  if (bloqueadas.has(clave(destino))) {
    throw jugadaInvalida('CASILLA_OCUPADA', 'Ya hay un barco en la casilla de destino.');
  }
  const ruta = buscarRuta(barco, destino, bloqueadas);
  if (!ruta) {
    throw jugadaInvalida('RUTA_BLOQUEADA', 'Hay barcos bloqueando todos los caminos hacia ese destino.');
  }

  const posicionesEnemigas = new Set(enemigos.map(clave));
  const casillas = new Map((await Casilla.findAll({ where: { partidaId: partida.id }, transaction }))
    .map((casilla) => [clave(casilla), casilla]));

  let posicion = { x: barco.x, y: barco.y };
  let recorridas = 0;
  let detenidoPor = 'DESTINO_ALCANZADO';
  let dano = 0;
  const recogidos = { chatarra: 0, combustible: 0, municion: 0 };

  for (const paso of ruta) {
    if (posicionesEnemigas.has(clave(paso))) {
      detenidoPor = 'BARCO_ENEMIGO';
      break;
    }
    posicion = paso;
    recorridas += 1;

    const casilla = casillas.get(clave(paso));
    const recogible = RECOGIBLES[casilla.tipo];
    if (recogible && !casilla.agotada) {
      recogidos[recogible.recurso] += recogible.cantidad;
      await casilla.update({ agotada: true }, { transaction });
    }
    if (casilla.tipo === 'CORRIENTE_PELIGROSA') {
      dano = 1;
      detenidoPor = 'CORRIENTE_PELIGROSA';
      await CasillaRevelada.findOrCreate({
        where: { jugadorPartidaId: jugador.id, casillaId: casilla.id },
        defaults: { rondaDescubierta: partida.rondaActual },
        transaction});
      break;
    }
  }

  const cascoActual = barco.cascoActual - dano;
  const hundido = cascoActual === 0;
  const combustible = recorridas * costoPorCasilla;
  await barco.update({ x: posicion.x, y: posicion.y, cascoActual, aFlote: !hundido }, { transaction });
  await jugador.update({
    combustible: jugador.combustible - combustible + recogidos.combustible,
    municion: jugador.municion + recogidos.municion,
    chatarra: jugador.chatarra + recogidos.chatarra,
    accionesRestantes: jugador.accionesRestantes - 1}, { transaction });

  const resultado = { casillaFinal: posicion, casillasRecorridas: recorridas, detenidoPor };
  if (dano) resultado.dano = dano;
  if (hundido) resultado.hundido = true;
  if (recogidos.chatarra) resultado.chatarraRecogida = recogidos.chatarra;
  if (recogidos.combustible) resultado.combustibleRecogido = recogidos.combustible;
  if (recogidos.municion) resultado.municionRecogida = recogidos.municion;
  const costos = { combustible, acciones: 1 };

  await Accion.create({
    jugadorPartidaId: jugador.id,
    barcoId: barco.id,
    tipo: 'MOVER',
    ronda: partida.rondaActual,
    resultado: { casillaDestino: { x: destino.x, y: destino.y }, ...resultado, costos }}, { transaction });

  return { tipoAccion: 'MOVER', barcoId: barco.id, resultado, costos, accionesRestantes: jugador.accionesRestantes };
}

const ACCIONES = {
  MOVER: { validar: validarMover, ejecutar: mover }};

async function realizarAccion(id, usuario, datos) {
  const partidaId = validarId(id);
  validarCuerpo(datos);
  const barcoId = validarId(datos.barcoId);

  return sequelize.transaction(async (transaction) => {
    const partida = await Partida.findByPk(partidaId, { lock: transaction.LOCK.UPDATE, transaction });
    if (!partida) {
      throw new HttpError(404, 'PARTIDA_NO_EXISTE', 'No existe una partida con ese ID.');
    }

    const jugador = await JugadorPartida.findOne({ where: { partidaId, usuarioId: usuario.id }, transaction });
    if (!jugador) {
      throw new HttpError(403, 'NO_PERTENECES_A_LA_PARTIDA', 'No eres jugador de esta partida.');
    }
    if (partida.estado !== 'EN_CURSO') {
      throw jugadaInvalida('PARTIDA_NO_ACTIVA', 'La partida no esta en curso.');
    }
    if (partida.turnoActualId !== jugador.id) {
      throw jugadaInvalida('NO_ES_TU_TURNO', 'No es tu turno, espera a que el rival termine.');
    }

    const barco = await Barco.findByPk(barcoId, { transaction });
    if (!barco) {
      throw new HttpError(404, 'BARCO_NO_EXISTE', 'No existe un barco con ese ID.');
    }
    if (barco.jugadorPartidaId !== jugador.id) {
      throw new HttpError(403, 'BARCO_NO_ES_TUYO', 'Ese barco no es tuyo.');
    }
    if (!barco.aFlote) {
      throw jugadaInvalida('BARCO_HUNDIDO', 'Ese barco ya no esta a flote.');
    }

    if (jugador.accionesRestantes <= 0) {
      throw jugadaInvalida('SIN_ACCIONES', 'Ya usaste todas las acciones de este turno.');
    }
    const usadas = await Accion.count({
      where: { jugadorPartidaId: jugador.id, barcoId: barco.id, ronda: partida.rondaActual },
      transaction});
    if (usadas >= MAX_ACCIONES_POR_BARCO) {
      throw jugadaInvalida('LIMITE_ACCIONES_BARCO', `Ese barco ya uso sus ${MAX_ACCIONES_POR_BARCO} acciones de este turno.`);
    }

    return ACCIONES[datos.tipoAccion].ejecutar(partida, jugador, barco, datos, transaction);
  });
}

async function listarAcciones(id, usuario) {
  await partidaService.obtenerPartida(id, usuario);

  return Accion.findAll({
    include: [{
      association: 'jugadorPartida',
      where: { partidaId: validarId(id), usuarioId: usuario.id },
      attributes: [],
    }],
    order: [['id', 'ASC']],
  });
}

async function obtenerAccion(id, accionId, usuario) {
  await partidaService.obtenerPartida(id, usuario);

  const accion = await Accion.findOne({
    where: { id: validarId(accionId) },
    include: [{
      association: 'jugadorPartida',
      where: { partidaId: validarId(id), usuarioId: usuario.id },
      attributes: [],
    }],
  });

  if (!accion) {
    throw new HttpError(404, 'ACCION_NO_EXISTE', 'No existe una accion tuya con ese ID en esta partida.');
  }

  return accion;
}

async function actualizarAccion(id, accionId, usuario, datos) {
  const accion = await obtenerAccion(id, accionId, usuario);
  const partida = await Partida.findByPk(validarId(id));

  if (partida.estado !== 'TERMINADA') {
    throw new HttpError(409, 'ACCION_NO_EDITABLE', 'Solo se pueden modificar registros de partidas terminadas.');
  }

  if (datos.tipo === undefined && datos.ronda === undefined && datos.resultado === undefined) {
    throw new HttpError(400, 'CAMPOS_FALTANTES', 'Debes enviar tipo, ronda o resultado para actualizar.');
  }

  await accion.update({
    tipo: datos.tipo,
    ronda: datos.ronda,
    resultado: datos.resultado,
  });

  return accion;
}

async function eliminarAccion(id, accionId, usuario) {
  const accion = await obtenerAccion(id, accionId, usuario);
  const partida = await Partida.findByPk(validarId(id));

  if (partida.estado !== 'TERMINADA') {
    throw new HttpError(409, 'ACCION_NO_EDITABLE', 'Solo se pueden modificar registros de partidas terminadas.');
  }

  await accion.destroy();
}

module.exports = {
  realizarAccion,
  listarAcciones,
  obtenerAccion,
  actualizarAccion,
  eliminarAccion,
};