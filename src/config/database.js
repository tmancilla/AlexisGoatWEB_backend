require('dotenv').config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  seederStorage: 'sequelize',
};

const produccion = process.env.DATABASE_URL
  ? {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    seederStorage: 'sequelize',
    dialectOptions: process.env.DB_SSL === 'false' ? {} : { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  }
  : { ...base, logging: false };

module.exports = {
  development: base,
  test: { ...base, database: `${process.env.DB_NAME}_test` },
  production: produccion,
};
