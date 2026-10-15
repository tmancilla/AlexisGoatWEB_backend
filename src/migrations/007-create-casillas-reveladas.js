module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CasillasReveladas', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true},

      jugadorPartidaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'JugadoresPartida', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'},

      casillaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Casillas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'},

      rondaDescubierta: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0},

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false},

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false}});

    await queryInterface.addConstraint('CasillasReveladas', {
      fields: ['jugadorPartidaId', 'casillaId'],
      type: 'unique',
      name: 'casillas_reveladas_jugador_casilla_unica'});
  },

  async down(queryInterface) {
    await queryInterface.dropTable('CasillasReveladas');
  },
};
