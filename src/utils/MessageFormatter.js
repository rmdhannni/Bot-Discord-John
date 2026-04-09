class MessageFormatter {
    /**
     * @param {string} text - Teks mentah dari database
     * @param {Object} member - Objek GuildMember Discord
     * @returns {string} - Teks yang sudah diformat
     */
    static format(text, member) {
        if (!text) return null;
        
        return text
            .replace(/{user}/g, `<@${member.id}>`) // Mention user
            .replace(/{username}/g, member.user.username) // Nama user
            .replace(/{server}/g, member.guild.name) // Nama server
            .replace(/{count}/g, member.guild.memberCount) // Jumlah member saat ini
            .replace(/{userAvatar}/g, member.user.displayAvatarURL({ dynamic: true, size: 512 })) // URL Avatar User
            .replace(/{serverIcon}/g, member.guild.iconURL({ dynamic: true }) || '') // URL Icon Server
            .replace(/{level}/g, member.level || ''); // Level User (Jika ada)
    }
}

module.exports = MessageFormatter;