const BaseCommand = require('../../structures/BaseCommand');
const UserProfile = require('../../models/UserProfile');
const Badge = require('../../models/Badge');
const Achievement = require('../../models/Achievement');
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ComponentType,
    AttachmentBuilder
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

class PreviewCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'preview',
            description: 'Pilih Badge atau Achievement yang ingin kamu pamerkan di kartu profil.',
            category: 'User',
            options: [
                {
                    name: 'badge',
                    description: 'Atur 8 badge utama untuk dipajang.',
                    type: 1 // SUB_COMMAND
                },
                {
                    name: 'achievement',
                    description: 'Atur 3 achievement utama untuk dipajang.',
                    type: 1 // SUB_COMMAND
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        try {
            let [profile] = await UserProfile.findOrCreate({ where: { guildId, userId } });

            // ================= LOGIKA BADGE =================
            if (subCommand === 'badge') {
                const ownedBadgeIds = profile.badges || [];
                const displayedBadgeIds = profile.displayedBadges || [];

                if (ownedBadgeIds.length === 0) {
                    return interaction.reply({ 
                        content: '❌ Kamu belum memiliki koleksi Lencana Gotham (Badge).', 
                        ephemeral: true 
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                const ownedBadges = await Badge.findAll({ where: { id: ownedBadgeIds } });

                // --- Generate Preview Image (Grid) ---
                const canvas = createCanvas(800, 400);
                const ctx = canvas.getContext('2d');
                
                // Background Gelap Gotham
                ctx.fillStyle = '#1e1e24';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const badgeSize = 80;
                const gap = 20;
                const badgesPerRow = 6;
                const badgesDir = path.join(__dirname, '../../../assets/badges');

                for (let i = 0; i < ownedBadges.length; i++) {
                    const badge = ownedBadges[i];
                    const row = Math.floor(i / badgesPerRow);
                    const col = i % badgesPerRow;
                    const x = 50 + col * (badgeSize + gap);
                    const y = 50 + row * (badgeSize + gap + 30);

                    const badgePath = path.join(badgesDir, badge.imageUrl);
                    if (fs.existsSync(badgePath)) {
                        try {
                            const img = await loadImage(badgePath);
                            ctx.drawImage(img, x, y, badgeSize, badgeSize);
                        } catch (e) {
                            ctx.fillStyle = '#ff0000';
                            ctx.fillRect(x, y, badgeSize, badgeSize);
                        }
                    }

                    // Tambahkan Label Nama Singkat/ID di bawah gambar
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(badge.name.substring(0, 10), x + badgeSize / 2, y + badgeSize + 15);
                }

                const buffer = await canvas.encode('png');
                const attachment = new AttachmentBuilder(buffer, { name: 'badge-preview.png' });
                // ------------------------------------

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('preview_select_badges')
                    .setPlaceholder('Pilih maksimal 8 badge...')
                    .setMinValues(0)
                    .setMaxValues(Math.min(8, ownedBadges.length));

                for (const badge of ownedBadges) {
                    selectMenu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(badge.name)
                            .setDescription(badge.description || 'Tidak ada deskripsi')
                            .setValue(badge.id.toString())
                            .setDefault(displayedBadgeIds.includes(badge.id || parseInt(badge.id)))
                    );
                }

                const row = new ActionRowBuilder().addComponents(selectMenu);
                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('🛡️ Galeri Lencana Gotham')
                    .setDescription('Pilih lencana yang ingin kamu sematkan di kartu identitasmu (Maksimal 8).\n\n*Lihat gambar pratinjau di atas untuk mencocokkan nama lencana.*')
                    .setImage('attachment://badge-preview.png');

                const response = await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });

                const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });
                collector.on('collect', async (i) => {
                    profile.displayedBadges = i.values.map(v => parseInt(v));
                    profile.changed('displayedBadges', true);
                    await profile.save();
                    await i.update({ content: `✅ Berhasil memasang **${i.values.length}** badge ke profilmu!`, embeds: [], components: [], files: [] });
                });
            }

            // ================= LOGIKA ACHIEVEMENT =================
            if (subCommand === 'achievement') {
                const unlockedCodes = profile.achievements || [];
                const displayedCodes = profile.displayedAchievements || [];

                if (unlockedCodes.length === 0) {
                    return interaction.reply({ 
                        content: '❌ Kamu belum memiliki Achievement (Gelar Kehormatan).', 
                        ephemeral: true 
                    });
                }

                const unlockedData = await Achievement.findAll({ where: { guildId, code: unlockedCodes } });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('preview_select_achievements')
                    .setPlaceholder('Pilih maksimal 3 achievement...')
                    .setMinValues(0)
                    .setMaxValues(Math.min(3, unlockedData.length));

                for (const ach of unlockedData) {
                    selectMenu.addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(ach.label)
                            .setDescription(ach.description || 'Tidak ada deskripsi')
                            .setValue(ach.code)
                            .setDefault(displayedCodes.includes(ach.code))
                    );
                }

                const row = new ActionRowBuilder().addComponents(selectMenu);
                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('🏅 Arsip Gelar Gotham')
                    .setDescription('Pilih gelar kehormatan yang ingin kamu pamerkan (Maksimal 3).');

                const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

                const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });
                collector.on('collect', async (i) => {
                    profile.displayedAchievements = i.values;
                    profile.changed('displayedAchievements', true);
                    await profile.save();
                    await i.update({ content: `✅ Berhasil memperbarui **${i.values.length}** gelar di profilmu!`, embeds: [], components: [] });
                });
            }

        } catch (error) {
            console.error(`[ERROR] /preview:`, error);
            if (interaction.deferred) await interaction.editReply({ content: '❌ Terjadi kesalahan internal.' });
            else await interaction.reply({ content: '❌ Terjadi kesalahan internal.', ephemeral: true });
        }
    }
}

module.exports = PreviewCommand;
