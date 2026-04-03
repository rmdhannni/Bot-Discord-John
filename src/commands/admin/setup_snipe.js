const BaseCommand = require('../../structures/BaseCommand');
const GuildConfig = require('../../models/GuildConfig');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class SetupSnipeCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'setup_snipe',
            description: 'Atur role mana yang diizinkan untuk menggunakan command /snipe.',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'role',
                    description: 'Pilih role yang diizinkan (misal: Moderator/VIP)',
                    type: 8, // 8 = ROLE
                    required: true
                }
            ]
        });
    }

    async execute(interaction) {
        const targetRole = interaction.options.getRole('role');
        const guildId = interaction.guild.id;

        try {
            // Cari config server, jika belum ada buat baru
            let [config] = await GuildConfig.findOrCreate({
                where: { guildId: guildId }
            });

            // Simpan ID role ke database
            config.snipeRoleId = targetRole.id;
            await config.save();

            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('⚙️ Otoritas Penyadapan (Snipe) Disebar!')
                .setDescription(`Sekarang aparat dengan tanda pengenal ${targetRole} (beserta Komisaris) punya akses ke arsip \`/snipe\`.`);

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`[ERROR] Gagal setup_snipe:`, error);
            await interaction.reply({ content: '❌ Terjadi kesalahan saat menyimpan pengaturan.', ephemeral: true });
        }
    }
}

module.exports = SetupSnipeCommand;