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
    emojiId: {
        type: DataTypes.STRING,
        allowNull: false, // Menyimpan ID Emoji Discord yang berhasil dibuat
    },
    emojiFormat: {
        type: DataTypes.STRING,
        allowNull: false, // Format tag untuk di chat, contoh: <:VIP_Donator:123456789>
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