module.exports = (sequelize, DataTypes) => {
  const JugadorPartida = sequelize.define(
    'JugadorPartida',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      partidaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      rolPartida: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: { args: [['DUENO', 'INVITADO']], msg: 'El rol en la partida debe ser DUENO o INVITADO.' },
        },
      },

      numeroJugador: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isIn: { args: [[1, 2]], msg: 'El número de jugador debe ser 1 o 2.' },
        },
      },

      combustible: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 12,
        validate: {
          min: { args: [0], msg: 'El combustible no puede ser negativo.' },
        },
      },

      municion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 8,
        validate: {
          min: { args: [0], msg: 'La munición no puede ser negativa.' },
        },
      },

      chatarra: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'La chatarra no puede ser negativa.' },
        },
      },

      accionesRestantes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        validate: {
          min: { args: [0], msg: 'Las acciones restantes no pueden ser negativas.' },
          max: { args: [3], msg: 'Un jugador tiene como máximo 3 acciones por turno.' },
        },
      },

      listo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      puntajeFinal: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'JugadoresPartida',
      indexes: [
        { unique: true, fields: ['partidaId', 'usuarioId'] },
        { unique: true, fields: ['partidaId', 'numeroJugador'] },
      ],
    }
  );

  JugadorPartida.associate = (models) => {
    JugadorPartida.belongsTo(models.Partida, { foreignKey: 'partidaId', as: 'partida' });
    JugadorPartida.belongsTo(models.Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
  };

  return JugadorPartida;
};