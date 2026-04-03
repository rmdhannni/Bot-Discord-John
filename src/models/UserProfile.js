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
        defaultValue: 1,
    },
    // XP khusus dari aktivitas chat (beda dari XP global/event)
    chatXP: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },

    // Bio singkat yang tampil di bawah kartu (About section)
    about: {
        type: DataTypes.STRING(280),
        allowNull: true,
    },
    backgroundUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    badges: {
        type: DataTypes.JSON,
        defaultValue: [],
    },
    achievements: {
        type: DataTypes.JSON,
        defaultValue: [],
    },
    displayedAchievements: {
        type: DataTypes.JSON,
        defaultValue: [],
    },
    displayedBadges: {
        type: DataTypes.JSON,
        defaultValue: [], // Badge yang dipilih user untuk tampil di Canvas
    },
}, {
    tableName: 'user_profiles',
    timestamps: true,
});

module.exports = UserProfile;