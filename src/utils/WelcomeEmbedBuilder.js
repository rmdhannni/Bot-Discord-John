const { EmbedBuilder } = require('discord.js');

class WelcomeEmbedBuilder {
    /**
     * Membuat Embed untuk Welcome yang dapat dikustomisasi
     * @param {Object} member - Objek GuildMember
     * @param {Object} config - Konfigurasi Guild dari DB
     * @param {string} description - Teks yang sudah diformat
     * @returns {EmbedBuilder}
     */
    static buildWelcome(member, config, description) {
        const embed = new EmbedBuilder()
            .setColor(config && config.welcomeColor ? config.welcomeColor : '#18181a')
            .setDescription(description)
            .setTimestamp();

        // 1. Judul (Title)
        if (config && config.welcomeTitle) {
            embed.setTitle(config.welcomeTitle);
        } else {
            embed.setAuthor({ 
                name: `Selamat Datang di ${member.guild.name}, ${member.user.username}! 🦇`, 
                iconURL: member.user.displayAvatarURL({ dynamic: true }) 
            });
        }

        // 2. Thumbnail (Kanan Atas)
        if (config && config.welcomeThumbnail) {
            // Jika user set '{userAvatar}', gunakan avatar member
            const thumbUrl = config.welcomeThumbnail === '{userAvatar}' 
                ? member.user.displayAvatarURL({ dynamic: true, size: 512 }) 
                : config.welcomeThumbnail;
            embed.setThumbnail(thumbUrl);
        } else {
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }));
        }

        // 3. Gambar Utama (Bawah)
        if (config && config.welcomeImage) {
            embed.setImage(config.welcomeImage);
        }

        // 4. Footer
        if (config && config.welcomeFooter) {
            const footerText = config.welcomeFooter
                .replace(/{count}/g, member.guild.memberCount)
                .replace(/{server}/g, member.guild.name)
                .replace(/{username}/g, member.user.username);
            
            embed.setFooter({ 
                text: footerText, 
                iconURL: member.guild.iconURL({ dynamic: true }) || null
            });
        } else {
            embed.setFooter({ 
                text: `Kamu adalah warga ${member.guild.name} ke-${member.guild.memberCount}!`, 
                iconURL: member.guild.iconURL({ dynamic: true }) || null
            });
        }

        return embed;
    }

    /**
     * Membuat Embed untuk Goodbye yang dapat dikustomisasi
     * @param {Object} member - Objek GuildMember
     * @param {Object} config - Konfigurasi Guild dari DB
     * @param {string} description - Teks yang sudah diformat
     * @returns {EmbedBuilder}
     */
    static buildGoodbye(member, config, description) {
        const embed = new EmbedBuilder()
            .setColor(config && config.goodbyeColor ? config.goodbyeColor : '#18181a')
            .setDescription(description)
            .setTimestamp();

        // 1. Judul (Title)
        if (config && config.goodbyeTitle) {
            embed.setTitle(config.goodbyeTitle);
        } else {
            embed.setAuthor({ 
                name: `Sampai Jumpa di Jalanan Gotham, ${member.user.username}... 🌧️`, 
                iconURL: member.user.displayAvatarURL({ dynamic: true }) 
            });
        }

        // 2. Thumbnail
        if (config && config.goodbyeThumbnail) {
            const thumbUrl = config.goodbyeThumbnail === '{userAvatar}' 
                ? member.user.displayAvatarURL({ dynamic: true, size: 512 }) 
                : config.goodbyeThumbnail;
            embed.setThumbnail(thumbUrl);
        } else {
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }));
        }

        // 3. Gambar Utama
        if (config && config.goodbyeImage) {
            embed.setImage(config.goodbyeImage);
        }

        // 4. Footer
        if (config && config.goodbyeFooter) {
            const footerText = config.goodbyeFooter
                .replace(/{count}/g, member.guild.memberCount)
                .replace(/{server}/g, member.guild.name)
                .replace(/{username}/g, member.user.username);
            
            embed.setFooter({ 
                text: footerText, 
                iconURL: member.guild.iconURL({ dynamic: true }) || null
            });
        } else {
            embed.setFooter({ 
                text: `Tersisa ${member.guild.memberCount} warga di Arkham/Gotham`, 
                iconURL: member.guild.iconURL({ dynamic: true }) || null
            });
        }

        return embed;
    }
}

module.exports = WelcomeEmbedBuilder;