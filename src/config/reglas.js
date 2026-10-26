const TAMANO_TABLERO = 10;

const ZONAS_DESPLIEGUE = {
  1: { desde: 1, hasta: 4 },
  2: { desde: 7, hasta: 10 }};

const BARCOS = {
  LANCHA: { casco: 1, movimiento: 3, alcance: 2, deteccion: 3, dado: 'd4', combustiblePorCasilla: 1, municionPorDisparo: 1, danoDisparo: 1 },
  FRAGATA: { casco: 2, movimiento: 2, alcance: 3, deteccion: 2, dado: 'd6', combustiblePorCasilla: 1, municionPorDisparo: 1, danoDisparo: 1 },
  DESTRUCTOR: { casco: 3, movimiento: 2, alcance: 4, deteccion: 2, dado: 'd8', combustiblePorCasilla: 2, municionPorDisparo: 1, danoDisparo: 1 },
  ACORAZADO: { casco: 4, movimiento: 1, alcance: 5, deteccion: 1, dado: 'd10', combustiblePorCasilla: 2, municionPorDisparo: 2, danoDisparo: 2 }};

const TIPOS_BARCO = Object.keys(BARCOS);

const TIPOS_CASILLA = ['AGUA_ABIERTA', 'POZO_PETROLERO', 'DEPOSITO_MUNICION', 'NAUFRAGIO', 'CORRIENTE_PELIGROSA', 'CHATARRA'];

const CASILLAS_ESPECIALES = [
  { tipo: 'POZO_PETROLERO', cantidad: 3, filas: { desde: 4, hasta: 7 } },
  { tipo: 'DEPOSITO_MUNICION', cantidad: 3, filas: { desde: 4, hasta: 7 } },
  { tipo: 'NAUFRAGIO', cantidad: 3, filas: { desde: 4, hasta: 7 } },
  { tipo: 'CORRIENTE_PELIGROSA', cantidad: 3, filas: null }];

const MAX_ACCIONES_POR_BARCO = 2;

const COMBUSTIBLE_EXTRA_SEGUNDO = 2;

const SEGUNDOS_DESPLIEGUE = 120;

const SEGUNDOS_TURNO = 180;

const CASILLAS_DE_RECURSO = ['POZO_PETROLERO', 'DEPOSITO_MUNICION'];

const TIPOS_ACCION = ['MOVER', 'DISPARAR', 'VIGIA', 'MEJORAR'];

const CHATARRA_NAUFRAGIO = 3;

const CHATARRA_HUNDIMIENTO = 2;

const TIPOS_COMBATE = ['DISTANCIA', 'CUERPO_A_CUERPO'];

const ACCIONES_POR_TURNO = 3;

// regla 8, lo que entrega cada casilla de recurso ocupada al inicio del turno
const RECOLECCION = {
  POZO_PETROLERO: { recurso: 'combustible', cantidad: 2 },
  DEPOSITO_MUNICION: { recurso: 'municion', cantidad: 2 }};

// regla 18
const COMBUSTIBLE_RESERVA = 1;

// regla 33
const CARTAS_EVENTO = {
  TORMENTA: 'Radio de detección -1 para todos los barcos esta ronda.',
  BOTIN_FLOTANTE: 'Aparece un bono de 2 de combustible o munición en una casilla vacía al azar.',
  SABOTAJE: 'Un jugador elegido al azar pierde 1 de munición.',
  MAREA_ALTA: 'Las corrientes peligrosas no hacen daño esta ronda.'};

// regla 36
const PUNTOS = {
  BARCO_A_FLOTE: 5,
  CASCO: 1,
  ENEMIGO_HUNDIDO: 10,
  CASILLA_RECURSO: 3,
  MEJORA: 2};

const MOTIVOS_FIN = ['FLOTA_DESTRUIDA', 'LIMITE_RONDAS', 'ABANDONO', 'EMPATE'];

module.exports = {
  TAMANO_TABLERO,
  ZONAS_DESPLIEGUE,
  BARCOS,
  TIPOS_BARCO,
  TIPOS_CASILLA,
  CASILLAS_ESPECIALES,
  MAX_ACCIONES_POR_BARCO,
  COMBUSTIBLE_EXTRA_SEGUNDO,
  SEGUNDOS_DESPLIEGUE,
  SEGUNDOS_TURNO,
  CASILLAS_DE_RECURSO,
  TIPOS_ACCION,
  CHATARRA_NAUFRAGIO,
  CHATARRA_HUNDIMIENTO,
  TIPOS_COMBATE,
  ACCIONES_POR_TURNO,
  RECOLECCION,
  COMBUSTIBLE_RESERVA,
  CARTAS_EVENTO,
  PUNTOS,
  MOTIVOS_FIN,
};
