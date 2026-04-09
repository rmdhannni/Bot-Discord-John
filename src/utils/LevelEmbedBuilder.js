const { EmbedBuilder } = require('discord.js');
const MessageFormatter = require('./MessageFormatter');

class LevelEmbedBuilder {
    /**
     * Membuat Embed untuk Notifikasi Naik Level yang dapat dikustomisasi
     * @param {Object} member - Objek GuildMember
     * @param {Object} config - Konfigurasi Guild dari DB
     * @param {number} level - Level baru user
     * @param {string} rewardText - Teks hadiah (jika ada)
     * @returns {EmbedBuilder}
     */
    static buildLevelUp(member, config, level, rewardText = '') {
        // Tambahkan properti level ke member untuk formatter (sementara)
        member.level = level;

        const rawMessage = config && config.levelUpMessage 
            ? config.levelUpMessage 
            : `🦇 Luar biasa {user}! Reputasimu di jalanan naik ke **Level {level}**!${rewardText}`;
        
        const description = MessageFormatter.format(rawMessage, member);

        const embed = new EmbedBuilder()
            .setColor(config && config.levelUpColor ? config.levelUpColor : '#95A5A6')
            .setDescription(description)
            .setTimestamp();

        // 1. Judul (Title)
        if (config && config.levelUpTitle) {
            const formattedTitle = MessageFormatter.format(config.levelUpTitle, member);
            embed.setTitle(formattedTitle);
        } else {
            const isGothamServer = member.guild.id === '1309013825005031425';
            embed.setAuthor({ 
                name: isGothamServer ? 'REPUTASI GOTHAM MENINGKAT!' : 'LEVEL UP!', 
                iconURL: isGothamServer ? 'https://cdn.discordapp.com/emojis/1305412852231573524.png' : null 
            });
        }

        // 2. Thumbnail
        if (config && config.levelUpThumbnail) {
            const thumbUrl = config.levelUpThumbnail === '{userAvatar}' 
                ? member.user.displayAvatarURL({ dynamic: true, size: 512 }) 
                : config.levelUpThumbnail;
            embed.setThumbnail(thumbUrl);
        } else {
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }));
        }

        // 3. Gambar Utama
        if (config && config.levelUpImage) {
            embed.setImage(config.levelUpImage);
        }

        // 4. Footer
        if (config && config.levelUpFooter) {
            const footerText = MessageFormatter.format(config.levelUpFooter, member);
            embed.setFooter({ 
                text: footerText, 
                iconURL: member.guild.iconURL({ dynamic: true }) || null
            });
        } else {
            embed.setFooter({ 
                text: `Kenaikan reputasi di ${member.guild.name}`, 
                iconURL: member.guild.iconURL({ dynamic: true }) || null
            });
        }

        return embed;
    }
}

module.exports = LevelEmbedBuilder;
