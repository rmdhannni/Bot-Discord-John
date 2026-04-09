const BaseCommand = require('../../structures/BaseCommand');
const UserProfile = require('../../models/UserProfile');
const GuildConfig = require('../../models/GuildConfig');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class SettingsCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'settings',
            description: 'Atur preferensi profil dan sistem bot.',
            category: 'User',
            options: [
                {
                    name: 'xp_notify',
                    description: 'Aktifkan atau nonaktifkan notifikasi naik level.',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'status',
                            description: 'Pilih status notifikasi',
                            type: 5, // BOOLEAN
                            required: true
                        }
                    ]
                },
                {
                    name: 'title',
                    description: 'Atur teks kustom (pronouns) di bawah username (Khusus Staff).',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'teks',
                            description: 'Teks kustom yang ingin ditampilkan',
                            type: 3, // STRING
                            required: true,
                            max_length: 50
                        }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        const [profile] = await UserProfile.findOrCreate({ where: { userId, guildId } });
        const config = await GuildConfig.findOne({ where: { guildId } });

        const embed = new EmbedBuilder().setColor('#95A5A6');

        if (subCommand === 'xp_notify') {
            const status = interaction.options.getBoolean('status');
            profile.xpNotification = status;
            await profile.save();

            embed.setTitle('🔔 Notifikasi Level Diperbarui')
                 .setDescription(`Notifikasi kenaikan level sekarang **${status ? 'AKTIF' : 'NONAKTIF'}**.`);
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subCommand === 'title') {
            const staffRoles = config?.staffRoles || [];
            const isAdmin = interaction.member.permissions.has('Administrator');
            const hasStaffAccess = isAdmin || staffRoles.some(id => interaction.member.roles.cache.has(id));

            if (!hasStaffAccess) {
                return interaction.reply({
                    content: '❌ Kamu tidak punya izin (Staff/Admin) untuk mengganti kustom title/pronouns.',
                    ephemeral: true
                });
            }

            const newTitle = interaction.options.getString('teks');
            profile.customTitle = newTitle === 'clear' ? null : newTitle;
            await profile.save();

            embed.setTitle('🏷️ Pronouns/Title Diperbarui')
                 .setDescription(`Teks di bawah usernamemu sekarang: **${newTitle}**`);
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
}

module.exports = SettingsCommand;
