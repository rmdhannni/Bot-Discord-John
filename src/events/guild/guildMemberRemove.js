const GuildConfig = require('../../models/GuildConfig');
const MessageFormatter = require('../../utils/MessageFormatter');
const WelcomeEmbedBuilder = require('../../utils/WelcomeEmbedBuilder');

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    
    async execute(member, client) {
        try {
            const config = await GuildConfig.findOne({ where: { guildId: member.guild.id } });
            if (!config) return;

            // Gunakan goodbyeChannelId, jika tidak ada fallback ke welcomeChannelId
            const channelId = config.goodbyeChannelId || config.welcomeChannelId;
            if (!channelId) return;

            const channel = member.guild.channels.cache.get(channelId);
            if (!channel) return;

            const rawMessage = config.leaveMessage || "Yah, **{username}** telah keluar dari server. Sampai jumpa lagi!";
            const formattedMessage = MessageFormatter.format(rawMessage, member);

            const goodbyeEmbed = WelcomeEmbedBuilder.buildGoodbye(member, config, formattedMessage);

            await channel.send({ 
                embeds: [goodbyeEmbed] 
            });

        } catch (error) {
            console.error(`[ERROR] Gagal mengirim pesan Goodbye di ${member.guild.name}:`, error);
        }
    }
};