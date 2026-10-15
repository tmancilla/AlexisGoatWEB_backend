const crypto = require('crypto');
const { TAMANO_TABLERO, ZONAS_DESPLIEGUE, CASILLAS_ESPECIALES } = require('../config/reglas');

// funciones puras del tablero, no tocan la base de datos asi que se pueden probar solas
// las coordenadas van de 1 a 10 igual que en el protocolo, x es la columna e y la fila

function clave(casilla) {
  return `${casilla.x},${casilla.y}`;
}

function dentroDelTablero(casilla) {
  return (
    Number.isInteger(casilla.x) &&
    Number.isInteger(casilla.y) &&
    casilla.x >= 1 && casilla.x <= TAMANO_TABLERO &&
    casilla.y >= 1 && casilla.y <= TAMANO_TABLERO
  );
}

// distancia manhattan, la misma que usan el movimiento ortogonal (regla 16) y el alcance (regla 23)
function distancia(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// todas las casillas del tablero a distancia radio o menos del centro, incluido el centro
// esto sirve para la deteccion de cada barco y despues para armar la niebla de guerra
// las reglas no dicen como se mide el radio de deteccion, asi que usamos manhattan igual que el resto (queda como rombo)
function casillasEnRadio(centro, radio) {
  const casillas = [];
  for (let y = centro.y - radio; y <= centro.y + radio; y += 1) {
    for (let x = centro.x - radio; x <= centro.x + radio; x += 1) {
      const casilla = { x, y };
      if (dentroDelTablero(casilla) && distancia(centro, casilla) <= radio) casillas.push(casilla);
    }
  }
  return casillas;
}

function enZonaDespliegue(casilla, numeroJugador) {
  const zona = ZONAS_DESPLIEGUE[numeroJugador];
  if (!zona || !dentroDelTablero(casilla)) return false;
  return casilla.y >= zona.desde && casilla.y <= zona.hasta;
}

function casillasDeZona(numeroJugador) {
  const zona = ZONAS_DESPLIEGUE[numeroJugador];
  if (!zona) return [];
  const casillas = [];
  for (let y = zona.desde; y <= zona.hasta; y += 1) {
    for (let x = 1; x <= TAMANO_TABLERO; x += 1) casillas.push({ x, y });
  }
  return casillas;
}

// fisher-yates con crypto para que el azar salga del servidor (regla 34) y no se pueda predecir
function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// arma las 100 casillas de una partida nueva con las 12 especiales de la regla 7 y el resto agua abierta
// devuelve objetos { x, y, tipo } listos para guardarlos en la tabla de casillas
function generarCasillas() {
  const casillas = [];
  for (let y = 1; y <= TAMANO_TABLERO; y += 1) {
    for (let x = 1; x <= TAMANO_TABLERO; x += 1) casillas.push({ x, y, tipo: 'AGUA_ABIERTA' });
  }

  CASILLAS_ESPECIALES.forEach((especial) => {
    // solo se eligen casillas que sigan siendo agua, asi dos especiales nunca caen en el mismo lugar
    const candidatas = casillas.filter((casilla) =>
      casilla.tipo === 'AGUA_ABIERTA' &&
      (!especial.filas || (casilla.y >= especial.filas.desde && casilla.y <= especial.filas.hasta)));
    mezclar(candidatas)
      .slice(0, especial.cantidad)
      .forEach((casilla) => {casilla.tipo = especial.tipo;});
  });

  return casillas;
}

module.exports = {
  clave,
  dentroDelTablero,
  distancia,
  casillasEnRadio,
  enZonaDespliegue,
  casillasDeZona,
  mezclar,
  generarCasillas,
};
