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
                return interaction.reply({ content: '❌ Kamu belum memiliki badge satupun.', ephemeral: true });
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

                await i.update({ content: `✅ Berhasil memasang **${i.values.length}** badge ke profilmu!`, components: [] });
            });

        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ Terjadi kesalahan sistem.', ephemeral: true });
        }
    }
}
module.exports = MyBadgesCommand;