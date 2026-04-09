const GuildConfig = require('../../models/GuildConfig');
const MessageFormatter = require('../../utils/MessageFormatter');
const WelcomeEmbedBuilder = require('../../utils/WelcomeEmbedBuilder'); 

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    
    async execute(member, client) {
        try {
            const config = await GuildConfig.findOne({ where: { guildId: member.guild.id } });
            if (!config || !config.welcomeChannelId) return;

            const channel = member.guild.channels.cache.get(config.welcomeChannelId);
            if (!channel) return;

            // Format teks (Jika kosong, gunakan default ini)
            const rawMessage = config.welcomeMessage || "Halo {user}! Selamat datang di **{server}**. Jangan lupa baca rules ya!";
            const formattedMessage = MessageFormatter.format(rawMessage, member);

            // Bangun Embed-nya (Sesuai Konfigurasi Database)
            const welcomeEmbed = WelcomeEmbedBuilder.buildWelcome(member, config, formattedMessage);

            // Kirim pesan: Mention user di luar embed, lalu tampilkan embed di bawahnya
            await channel.send({ 
                content: `Haii <@${member.id}>!`, 
                embeds: [welcomeEmbed] 
            });

        } catch (error) {
            console.error(`[ERROR] Gagal mengirim pesan Welcome di ${member.guild.name}:`, error);
        }
    }
};