module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MejorasBarco', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true},

      barcoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Barcos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'},

      catalogoMejoraId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'CatalogoMejoras', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION'},

      rondaAdquirida: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0},

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false},

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false}});

    await queryInterface.addConstraint('MejorasBarco', {
      fields: ['barcoId', 'catalogoMejoraId'],
      type: 'unique',
      name: 'mejoras_barco_barco_mejora_unica'});
  },

  async down(queryInterface) {
    await queryInterface.dropTable('MejorasBarco');
  },
};
