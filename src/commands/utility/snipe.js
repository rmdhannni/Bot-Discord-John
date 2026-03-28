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
            if (!config || !config.snipeRoleId) {
                return interaction.reply({ 
                    content: '❌ Fitur Snipe belum diaktifkan. Admin harus mengatur role menggunakan `/setup_snipe` terlebih dahulu.', 
                    ephemeral: true 
                });
            }

            // 3. GATEKEEPER: Cek apakah user punya Role tersebut ATAU user adalah Administrator
            const hasRole = member.roles.cache.has(config.snipeRoleId);
            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

            if (!hasRole && !isAdmin) {
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
                .setDescription(snipedMessage.content || '*Pesan tidak memiliki teks (mungkin gambar/embed)*')
                .setFooter({ text: `Dikirim pada` })
                .setTimestamp(snipedMessage.timestamp);

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`[ERROR] Gagal mengeksekusi /snipe:`, error);
            await interaction.reply({ content: '❌ Terjadi kesalahan internal.', ephemeral: true });
        }
    }
}

module.exports = SnipeCommand;