const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const BoosterUser = sequelize.define('BoosterUser', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    customRoleId: {
        type: DataTypes.STRING,
        allowNull: true, // ID custom role buatan mereka sendiri
    },
    personalChannelId: {
        type: DataTypes.STRING,
        allowNull: true, // ID channel pribadi mereka
    },
    boostCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0, // Untuk fitur "level role"
    },
    boostDuration: {
        type: DataTypes.INTEGER,
        defaultValue: 0, // Dalam hitungan hari, untuk fitur "age role"
    }
}, {
    tableName: 'booster_users',
    timestamps: true,
});

module.exports = BoosterUser;