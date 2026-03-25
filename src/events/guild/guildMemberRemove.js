const GuildConfig = require('../../models/GuildConfig');
const MessageFormatter = require('../../utils/MessageFormatter');
const WelcomeEmbedBuilder = require('../../utils/WelcomeEmbedBuilder');

module.exports = {
    name: 'guildMemberRemove',
    once: false,
    
    async execute(member, client) {
        try {
            const config = await GuildConfig.findOne({ where: { guildId: member.guild.id } });
            
            // Asumsi menggunakan channel welcome untuk goodbye juga
            if (!config || !config.welcomeChannelId) return;

            const channel = member.guild.channels.cache.get(config.welcomeChannelId);
            if (!channel) return;

            const rawMessage = config.leaveMessage || "Yah, **{username}** telah keluar dari server. Sampai jumpa lagi!";
            const formattedMessage = MessageFormatter.format(rawMessage, member);

            const goodbyeEmbed = WelcomeEmbedBuilder.buildGoodbye(member, formattedMessage);

            await channel.send({ 
                embeds: [goodbyeEmbed] 
            });

        } catch (error) {
            console.error(`[ERROR] Gagal mengirim pesan Goodbye di ${member.guild.name}:`, error);
        }
    }
};