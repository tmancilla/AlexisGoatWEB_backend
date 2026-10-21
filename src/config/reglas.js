// aca quedan los numeros fijos de las reglas del juego (propuesta E1) para no repetirlos por todo el backend
// los recursos iniciales (12, 8, 0) y las 3 acciones por turno ya son defaults del modelo JugadorPartida
const TAMANO_TABLERO = 10;

// regla 1, la zona depende del numeroJugador y las filas 5 y 6 quedan neutrales
const ZONAS_DESPLIEGUE = {
  1: { desde: 1, hasta: 4 },
  2: { desde: 7, hasta: 10 }};

// regla 3, danoDisparo sale de la regla 24 (el acorazado quita 2 de casco)
const BARCOS = {
  LANCHA: { casco: 1, movimiento: 3, alcance: 2, deteccion: 3, dado: 'd4', combustiblePorCasilla: 1, municionPorDisparo: 1, danoDisparo: 1 },
  FRAGATA: { casco: 2, movimiento: 2, alcance: 3, deteccion: 2, dado: 'd6', combustiblePorCasilla: 1, municionPorDisparo: 1, danoDisparo: 1 },
  DESTRUCTOR: { casco: 3, movimiento: 2, alcance: 4, deteccion: 2, dado: 'd8', combustiblePorCasilla: 2, municionPorDisparo: 1, danoDisparo: 1 },
  ACORAZADO: { casco: 4, movimiento: 1, alcance: 5, deteccion: 1, dado: 'd10', combustiblePorCasilla: 2, municionPorDisparo: 2, danoDisparo: 2 }};

const TIPOS_BARCO = Object.keys(BARCOS);

const TIPOS_CASILLA = ['AGUA_ABIERTA', 'POZO_PETROLERO', 'DEPOSITO_MUNICION', 'NAUFRAGIO', 'CORRIENTE_PELIGROSA', 'CHATARRA'];

// regla 7, las de recursos solo salen entre las filas 4 y 7 y las corrientes pueden quedar en cualquier parte
// si una corriente queda en una zona de despliegue no pasa nada, la regla 10 solo daña al barco que entra moviendose
const CASILLAS_ESPECIALES = [
  { tipo: 'POZO_PETROLERO', cantidad: 3, filas: { desde: 4, hasta: 7 } },
  { tipo: 'DEPOSITO_MUNICION', cantidad: 3, filas: { desde: 4, hasta: 7 } },
  { tipo: 'NAUFRAGIO', cantidad: 3, filas: { desde: 4, hasta: 7 } },
  { tipo: 'CORRIENTE_PELIGROSA', cantidad: 3, filas: null }];

// regla 13
const MAX_ACCIONES_POR_BARCO = 2;

// regla 5, lo recibe el jugador que no parte en el sorteo del primer turno
const COMBUSTIBLE_EXTRA_SEGUNDO = 2;

const SEGUNDOS_DESPLIEGUE = 120;

const SEGUNDOS_TURNO = 180;

const CASILLAS_DE_RECURSO = ['POZO_PETROLERO', 'DEPOSITO_MUNICION'];

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
};
