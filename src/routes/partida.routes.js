const Router = require('@koa/router');
const partidaController = require('../controllers/partida.controller');
const despliegueController = require('../controllers/despliegue.controller');
const accionController = require('../controllers/accion.controller');
const usuarioActual = require('../middlewares/usuarioActual');

const router = new Router({
  prefix: '/games',
});

router.use(usuarioActual);

router.get('/', partidaController.listarPartidas);
router.post('/', partidaController.crearPartida);
router.post('/matchmaking', partidaController.buscarRival);
router.post('/:codigo/join', partidaController.unirsePorCodigo);
router.post('/:id/desplegar', despliegueController.desplegar);
router.post('/:id/acciones', accionController.realizarAccion);
router.get('/:id', partidaController.obtenerPartida);
router.patch('/:id', partidaController.actualizarPartida);
router.delete('/:id', partidaController.cancelarPartida);

module.exports = router;