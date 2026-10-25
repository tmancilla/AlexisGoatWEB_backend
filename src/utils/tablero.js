const crypto = require('crypto');
const { TAMANO_TABLERO, ZONAS_DESPLIEGUE, CASILLAS_ESPECIALES } = require('../config/reglas');

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

function distancia(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

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

function casillasVistas(barcos) {
  return new Set(barcos
    .filter((barco) => barco.aFlote)
    .flatMap((barco) => casillasEnRadio(barco, barco.deteccion))
    .map(clave));
}

function buscarRuta(origen, destino, bloqueadas) {
  if (origen.x === destino.x && origen.y === destino.y) return [];
  const pasos = [];
  if (destino.x !== origen.x) pasos.push({ x: origen.x + Math.sign(destino.x - origen.x), y: origen.y });
  if (destino.y !== origen.y) pasos.push({ x: origen.x, y: origen.y + Math.sign(destino.y - origen.y) });
  for (const paso of pasos) {
    if (bloqueadas.has(clave(paso))) continue;
    const resto = buscarRuta(paso, destino, bloqueadas);
    if (resto) return [paso, ...resto];
  }
  return null;
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

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function generarCasillas() {
  const casillas = [];
  for (let y = 1; y <= TAMANO_TABLERO; y += 1) {
    for (let x = 1; x <= TAMANO_TABLERO; x += 1) casillas.push({ x, y, tipo: 'AGUA_ABIERTA' });
  }

  CASILLAS_ESPECIALES.forEach((especial) => {
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
  casillasVistas,
  buscarRuta,
  enZonaDespliegue,
  casillasDeZona,
  mezclar,
  generarCasillas,
};
