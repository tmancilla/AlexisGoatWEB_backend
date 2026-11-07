require('dotenv').config();
const http = require('http');
const app = require('./app');
const { iniciarSocket } = require('./realtime/socket');
const { iniciarVencimientos } = require('./realtime/vencimientos');

const PORT = process.env.PORT || 3000;

const servidor = http.createServer(app.callback());
iniciarSocket(servidor);
iniciarVencimientos();

servidor.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});