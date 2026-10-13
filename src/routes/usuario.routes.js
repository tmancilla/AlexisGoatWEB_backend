const Router = require('@koa/router');
const usuarioController = require('../controllers/usuario.controller');

const router = new Router({
  prefix: '/users',
});

router.get('/', usuarioController.listarUsuarios);
router.get('/:id', usuarioController.obtenerUsuario);
router.post('/', usuarioController.crearUsuario);
router.patch('/:id', usuarioController.actualizarUsuario);
router.delete('/:id', usuarioController.eliminarUsuario);

module.exports = router;