const Router = require('@koa/router');
const authController = require('../controllers/auth.controller');

const router = new Router({
  prefix: '/auth',
});

router.post('/register', authController.registrarUsuario);
router.post('/login', authController.iniciarSesion);

module.exports = router;