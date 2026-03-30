const BaseCommand = require('../../structures/BaseCommand');
const UserProfile = require('../../models/UserProfile');
const Badge = require('../../models/Badge');
const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, EmbedBuilder } = require('discord.js');

class MyBadgesCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'mybadges',
            description: 'Atur badge apa saja yang ingin kamu pamerkan di Profil Card-mu.',
            category: 'User'
        });
    }

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        try {
            let [profile] = await UserProfile.findOrCreate({ where: { guildId, userId } });
            const ownedBadgeIds = profile.badges || [];
            const displayedBadgeIds = profile.displayedBadges || [];

            if (ownedBadgeIds.length === 0) {
                const noBadgeEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎖️ Kamu Belum Punya Badge')
                    .setDescription(
                        'Kamu belum memiliki badge satupun saat ini.\n\n' +
                        '**Bagaimana cara mendapatkan badge?**\n' +
                        '> • Ikuti event atau giveaway di server\n' +
                        '> • Menjadi donatur server\n' +
                        '> • Badge diberikan langsung oleh Admin'
                    )
                    .setFooter({ text: 'Badge kamu akan muncul di sini setelah diterima.' });
                return interaction.reply({ embeds: [noBadgeEmbed], ephemeral: true });
            }

            const ownedBadges = await Badge.findAll({ where: { id: ownedBadgeIds } });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_badges')
                .setPlaceholder('Pilih maksimal 8 badge...')
                .setMinValues(0)
                .setMaxValues(Math.min(8, ownedBadges.length));

            for (const badge of ownedBadges) {
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(badge.name)
                        .setValue(badge.id.toString())
                        .setEmoji(badge.emojiId) // Gunakan custom emoji server
                        .setDefault(displayedBadgeIds.includes(badge.id.toString() || badge.id))
                );
            }

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const response = await interaction.reply({ 
                content: 'Pilih badge yang ingin kamu pakai di profilmu:', 
                components: [row], ephemeral: true 
            });

            const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== userId) return;
                // Simpan pilihan (pastikan tipe datanya array of integer jika ID berupa integer)
                profile.displayedBadges = i.values.map(v => parseInt(v));
                profile.changed('displayedBadges', true);
                await profile.save();

                if (i.values.length === 0) {
                    await i.update({ content: '✅ Semua badge berhasil dilepas dari profilmu.', components: [] });
                } else {
                    await i.update({ content: `✅ Berhasil memasang **${i.values.length}** badge ke profilmu!`, components: [] });
                }
            });

        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ Terjadi kesalahan sistem.', ephemeral: true });
        }
    }
}
module.exports = MyBadgesCommand;