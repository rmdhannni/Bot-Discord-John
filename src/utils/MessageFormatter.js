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
            .replace(/{memberCount}/g, member.guild.memberCount); // Jumlah member saat ini
    }
}

module.exports = MessageFormatter;