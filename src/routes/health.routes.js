const Router = require('@koa/router');
const { getHealth } = require('../controllers/health.controller');

const router = new Router();
router.get('/health', getHealth);

module.exports = router;