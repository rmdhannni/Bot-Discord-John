const { EmbedBuilder } = require('discord.js');

class WelcomeEmbedBuilder {
    /**
     * Membuat Embed untuk Welcome
     * @param {Object} member - Objek GuildMember
     * @param {string} description - Teks yang sudah diformat (dari MessageFormatter)
     * @returns {EmbedBuilder}
     */
    static buildWelcome(member, description) {
        return new EmbedBuilder()
            .setColor('#2ECC71') // Warna hijau cerah khas Soya
            .setAuthor({ 
                name: `Selamat Datang, ${member.user.username}! 👋`, 
                iconURL: member.user.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(description)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            // Anda bisa memasukkan URL gambar default untuk banner di bawah ini jika mau
            // .setImage('https://link-gambar-banner-server.com/banner.png')
            .setFooter({ 
                text: `Kamu adalah member ke-${member.guild.memberCount} di ${member.guild.name}`, 
                iconURL: member.guild.iconURL({ dynamic: true }) || null
            })
            .setTimestamp();
    }

    /**
     * Membuat Embed untuk Goodbye
     * @param {Object} member - Objek GuildMember
     * @param {string} description - Teks yang sudah diformat
     * @returns {EmbedBuilder}
     */
    static buildGoodbye(member, description) {
        return new EmbedBuilder()
            .setColor('#E74C3C') // Warna merah untuk Goodbye
            .setAuthor({ 
                name: `Selamat Tinggal, ${member.user.username}... 🕊️`, 
                iconURL: member.user.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(description)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ 
                text: `Tersisa ${member.guild.memberCount} member di ${member.guild.name}`, 
                iconURL: member.guild.iconURL({ dynamic: true }) || null
            })
            .setTimestamp();
    }
}

module.exports = WelcomeEmbedBuilder;