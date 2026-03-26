const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Achievement = sequelize.define('Achievement', {
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false, // Kode unik tanpa spasi, misal: "juara_1" atau "donatur_sultan"
    },
    label: {
        type: DataTypes.STRING,
        allowNull: false, // Nama yang tampil, misal: "Juara Turnamen"
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true, // Deskripsi pencapaian
    },
    emoji: {
        type: DataTypes.STRING,
        allowNull: true, // Emoji bawaan Discord (misal: 🏆 atau 💎)
    }
}, {
    tableName: 'achievements_master',
    timestamps: false,
});

module.exports = Achievement;