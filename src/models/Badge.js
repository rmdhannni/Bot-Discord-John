const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Badge = sequelize.define('Badge', {
    guildId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false, // Contoh: "VIP_Donator"
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true, // Deskripsi singkat untuk badge
    },
    emojiId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    emojiFormat: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: false, // URL gambar asli, sangat berguna untuk di-render di Canvas (Kartu Nama) nanti
    },
    isClaimable: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false // Apakah user bisa claim sendiri?
    },
    claimDeadline: { 
        type: DataTypes.DATE, 
        allowNull: true // Batas waktu claim (jika null = permanen)
    }
},  {
    tableName: 'badges',
    timestamps: false,
});

module.exports = Badge;