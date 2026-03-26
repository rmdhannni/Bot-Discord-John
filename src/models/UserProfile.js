const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const UserProfile = sequelize.define('UserProfile', {
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    xp: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    level: {
        type: DataTypes.INTEGER,
        defaultValue: 1, // Semua orang dimulai dari Level 1
    },
    backgroundUrl: {
        type: DataTypes.STRING,
        allowNull: true, // Akan diisi oleh Admin jika user me-request custom background
    },
    badges: {
        type: DataTypes.JSON,
        defaultValue: [], // Array berisi ID Lencana (Donatur/Event) yang diberikan Admin
    },
    achievements: {
        type: DataTypes.JSON,
        defaultValue: [], // Array berisi semua achievement yang sudah di-unlock
    },
    displayedAchievements: {
        type: DataTypes.JSON,
        defaultValue: [], // Array maksimal 3 achievement yang dipilih user untuk tampil di dropdown/kartu
    }
}, {
    tableName: 'user_profiles',
    timestamps: true,
});

module.exports = UserProfile;