const Router = require('@koa/router');
const healthRoutes = require('./health.routes');

const router = new Router();
router.use(healthRoutes.routes());

module.exports = router;