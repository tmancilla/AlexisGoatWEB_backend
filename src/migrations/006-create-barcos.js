module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Barcos', {
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

      tipo: {
        type: Sequelize.STRING,
        allowNull: false},

      cascoActual: {
        type: Sequelize.INTEGER,
        allowNull: false},

      cascoMaximo: {
        type: Sequelize.INTEGER,
        allowNull: false},

      movimiento: {
        type: Sequelize.INTEGER,
        allowNull: false},

      alcance: {
        type: Sequelize.INTEGER,
        allowNull: false},

      deteccion: {
        type: Sequelize.INTEGER,
        allowNull: false},

      x: {
        type: Sequelize.INTEGER,
        allowNull: false},

      y: {
        type: Sequelize.INTEGER,
        allowNull: false},

      aFlote: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true},

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false},

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false}});

    await queryInterface.addConstraint('Barcos', {
      fields: ['jugadorPartidaId', 'tipo'],
      type: 'unique',
      name: 'barcos_jugador_tipo_unico'});
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Barcos');
  },
};
