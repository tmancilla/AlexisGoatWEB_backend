const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const errorHandler = require('./middlewares/errorHandler');
const router = require('./routes');

const app = new Koa();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(errorHandler);
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

module.exports = app;