const Router = require('@koa/router');
const usuarioController = require('../controllers/usuario.controller');
const partidaController = require('../controllers/partida.controller');
const autenticar = require('../middlewares/autenticar');
const exigirRol = require('../middlewares/exigirRol');

const router = new Router({
  prefix: '/admin',
});

router.use(autenticar);
router.use(exigirRol('Administrador'));

router.get('/usuarios', usuarioController.listarUsuarios);
router.get('/partidas', partidaController.listarPartidas);

module.exports = router;