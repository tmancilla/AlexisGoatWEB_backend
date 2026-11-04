const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [usuarios] = await queryInterface.sequelize.query(
        'SELECT "id", "password" FROM "Usuarios" FOR UPDATE',
        { transaction }
      );

      for (const usuario of usuarios) {
        const yaProtegida = /^\$2[ab]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(
          usuario.password
        );

        if (yaProtegida) {
          continue;
        }

        const passwordProtegida = await bcrypt.hash(usuario.password, 10);

        await queryInterface.bulkUpdate(
          'Usuarios',
          { password: passwordProtegida },
          { id: usuario.id },
          { transaction }
        );
      }
    });
  },

  async down() {
    throw new Error(
      'Esta migración no se puede revertir: los hashes no permiten recuperar las contraseñas originales.'
    );
  },
};