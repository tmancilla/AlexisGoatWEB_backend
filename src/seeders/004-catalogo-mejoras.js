// costos sacados de la regla 30, todas las mejoras suben 1 punto el stat
const MEJORAS = [
  { nombre: 'BLINDAJE', atributo: 'casco', costoChatarra: 3 },
  { nombre: 'MOTORES', atributo: 'movimiento', costoChatarra: 2 },
  { nombre: 'ARTILLERIA', atributo: 'alcance', costoChatarra: 3 },
  { nombre: 'RADAR', atributo: 'deteccion', costoChatarra: 2 }];

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    await queryInterface.bulkInsert(
      'CatalogoMejoras',
      MEJORAS.map((mejora) => ({ ...mejora, incremento: 1, createdAt: ahora, updatedAt: ahora })));
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('CatalogoMejoras', {
      nombre: { [Sequelize.Op.in]: MEJORAS.map((mejora) => mejora.nombre) }});
  },
};
