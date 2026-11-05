const Router = require('@koa/router');
const partidaController = require('../controllers/partida.controller');
const despliegueController = require('../controllers/despliegue.controller');
const accionController = require('../controllers/accion.controller');
const turnoController = require('../controllers/turno.controller');
const eventoController = require('../controllers/evento.controller');
const combateController = require('../controllers/combate.controller');
const barcoController = require('../controllers/barco.controller');
const casillaController = require('../controllers/casilla.controller');
const autenticar = require('../middlewares/autenticar');
const exigirRol = require('../middlewares/exigirRol');

const soloAdministrador = exigirRol('Administrador');

const router = new Router({
  prefix: '/games',
});

router.use(autenticar);

router.get('/', partidaController.listarPartidas);
router.post('/', partidaController.crearPartida);
router.post('/matchmaking', partidaController.buscarRival);
router.post('/:codigo/join', partidaController.unirsePorCodigo);
router.post('/:id/desplegar', despliegueController.desplegar);
router.post('/:id/acciones', accionController.realizarAccion);
router.get('/:id/acciones', accionController.listarAcciones);
router.get('/:id/acciones/:accionId', accionController.obtenerAccion);
router.patch('/:id/acciones/:accionId', accionController.actualizarAccion);
router.delete('/:id/acciones/:accionId', accionController.eliminarAccion);
router.post('/:id/terminar-turno', turnoController.terminarTurno);
router.post('/:id/abandonar', turnoController.abandonar);
router.get('/:id/eventos', eventoController.listarEventos);
router.get('/:id/eventos/:eventoId', eventoController.obtenerEvento);
router.post('/:id/eventos', eventoController.crearEvento);
router.patch('/:id/eventos/:eventoId', eventoController.actualizarEvento);
router.delete('/:id/eventos/:eventoId', eventoController.eliminarEvento);
router.get('/:id/combates', combateController.listarCombates);
router.get('/:id/combates/:combateId', combateController.obtenerCombate);
router.post('/:id/combates', combateController.crearCombate);
router.patch('/:id/combates/:combateId', combateController.actualizarCombate);
router.delete('/:id/combates/:combateId', combateController.eliminarCombate);
router.get('/:id/barcos', soloAdministrador, barcoController.listarBarcos);
router.get('/:id/barcos/:barcoId', soloAdministrador, barcoController.obtenerBarco);
router.post('/:id/barcos', soloAdministrador, barcoController.crearBarco);
router.patch('/:id/barcos/:barcoId', soloAdministrador, barcoController.actualizarBarco);
router.delete('/:id/barcos/:barcoId', soloAdministrador, barcoController.eliminarBarco);
router.get('/:id/casillas', soloAdministrador, casillaController.listarCasillas);
router.get('/:id/casillas/:casillaId', soloAdministrador, casillaController.obtenerCasilla);
router.post('/:id/casillas', soloAdministrador, casillaController.crearCasilla);
router.patch('/:id/casillas/:casillaId', soloAdministrador, casillaController.actualizarCasilla);
router.delete('/:id/casillas/:casillaId', soloAdministrador, casillaController.eliminarCasilla);
router.get('/:id', partidaController.obtenerPartida);
router.patch('/:id', partidaController.actualizarPartida);
router.delete('/:id', partidaController.cancelarPartida);

module.exports = router;