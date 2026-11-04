const Router = require('@koa/router');
const healthRoutes = require('./health.routes');
const usuarioRoutes = require('./usuario.routes');
const authRoutes = require('./auth.routes');
const partidaRoutes = require('./partida.routes');
const adminRoutes = require('./admin.routes');

const router = new Router();

router.use(healthRoutes.routes());
router.use(usuarioRoutes.routes());
router.use(authRoutes.routes());
router.use(partidaRoutes.routes());
router.use(adminRoutes.routes());

module.exports = router;