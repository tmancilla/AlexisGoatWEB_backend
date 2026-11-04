const { execFileSync } = require('child_process');
const path = require('path');

require('./setup');

module.exports = () => {
  const ejecutable = require.resolve('sequelize-cli/lib/sequelize');
  const raiz = path.resolve(__dirname, '..');
  const configuracion = path.join(raiz, 'src', 'config', 'database.js');

  const comandos = [
    'db:drop',
    'db:create',
    'db:migrate',
    'db:seed:all',
  ];

  for (const comando of comandos) {
    execFileSync(
      process.execPath,
      [ejecutable, comando, '--env', 'test', '--config', configuracion],
      {
        cwd: raiz,
        stdio: 'inherit',
      }
    );
  }
};