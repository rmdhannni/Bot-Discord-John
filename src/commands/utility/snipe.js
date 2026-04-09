const BaseCommand = require('../../structures/BaseCommand');
const GuildConfig = require('../../models/GuildConfig'); // 📍 Import Config
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class SnipeCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'snipe',
            description: 'Lihat pesan terakhir yang dihapus di channel ini.',
            category: 'Utility'
        });
    }

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const member = interaction.member;

        try {
            // 1. Ambil pengaturan dari Database
            const config = await GuildConfig.findOne({ where: { guildId: guildId } });

            // 2. Cek apakah Admin sudah mengatur Role untuk Snipe
            const allowedRoles = config?.snipeAllowedRoles || [];
            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

            // 3. GATEKEEPER: Cek apakah user punya setidaknya salah satu Role tersebut ATAU Administrator
            const hasAccess = allowedRoles.some(roleID => member.roles.cache.has(roleID));

            if (!hasAccess && !isAdmin) {
                return interaction.reply({ 
                    content: '🔒 Akses Ditolak! Kamu tidak memiliki role yang diizinkan untuk menggunakan fitur ini.', 
                    ephemeral: true 
                });
            }

            // 4. Logika Snipe (Jika lolos pengecekan)
            const snipedMessage = this.client.snipeManager.getSnipe(interaction.channelId);

            if (!snipedMessage) {
                return interaction.reply({ content: 'Tidak ada pesan yang baru dihapus di channel ini!', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#95A5A6') // Warna merah menandakan pesan dihapus
                .setAuthor({ 
                    name: snipedMessage.author.tag, 
                    iconURL: snipedMessage.author.displayAvatarURL({ dynamic: true }) 
                })
                .setDescription(snipedMessage.content || '*Data hilang di gorong-gorong Gotham (mungkin berupa gambar/embed)*')
                .setFooter({ text: `Dicegat pada` })
                .setTimestamp(snipedMessage.timestamp);

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`[ERROR] Gagal mengeksekusi /snipe:`, error);
            await interaction.reply({ content: '❌ Terjadi kesalahan internal.', ephemeral: true });
        }
    }
}

module.exports = SnipeCommand;