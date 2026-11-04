const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define(
    'Usuario',
    {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          isEmail: true,
        },
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Jugador',
        validate: {
          isIn: [['Jugador', 'Administrador']],
        },
      },
    },
    {
      tableName: 'Usuarios',

      hooks: {
        beforeCreate: async (usuario) => {
          usuario.password = await bcrypt.hash(usuario.password, 10);
        },

        beforeUpdate: async (usuario) => {
          if (usuario.changed('password')) {
            usuario.password = await bcrypt.hash(usuario.password, 10);
          }
        },
      },
    }
  );

  Usuario.associate = (models) => {
    Usuario.belongsToMany(models.Partida, {
      through: models.JugadorPartida,
      foreignKey: 'usuarioId',
      otherKey: 'partidaId',
      as: 'partidas',
    });

    Usuario.hasMany(models.JugadorPartida, {
      foreignKey: 'usuarioId',
      as: { singular: 'participacion', plural: 'participaciones' },
    });
  };

  return Usuario;
};