const Router = require('@koa/router');
const usuarioController = require('../controllers/usuario.controller');
const autenticar = require('../middlewares/autenticar');
const exigirRol = require('../middlewares/exigirRol');
const exigirUsuarioOAdmin = require('../middlewares/exigirUsuarioOAdmin');

const router = new Router({
  prefix: '/users',
});

router.get('/', autenticar, exigirRol('Administrador'), usuarioController.listarUsuarios);
router.get('/:id', autenticar, exigirUsuarioOAdmin, usuarioController.obtenerUsuario);
router.post('/', usuarioController.crearUsuario);
router.patch('/:id', autenticar, exigirUsuarioOAdmin, usuarioController.actualizarUsuario);
router.delete('/:id', autenticar, exigirRol('Administrador'), usuarioController.eliminarUsuario);

module.exports = router;