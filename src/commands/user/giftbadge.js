const BaseCommand = require('../../structures/BaseCommand');
const Badge = require('../../models/Badge');
const UserProfile = require('../../models/UserProfile');
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ComponentType 
} = require('discord.js');

class GiftBadgeCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'giftbadge',
            description: 'Berikan badge milikmu kepada user lain (Badge-mu akan hilang dan jadi milik mereka).',
            category: 'User',
            options: [
                {
                    name: 'user',
                    description: 'Pilih user yang ingin kamu berikan badge',
                    type: 6, // 6 = USER
                    required: true
                }
            ]
        });
    }

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const senderId = interaction.user.id;
        const guildId = interaction.guild.id;

        // 1. Validasi Dasar (Anti-Troll)
        if (targetUser.id === senderId) {
            return interaction.reply({ content: '❌ Kamu tidak bisa mengirim badge ke dirimu sendiri!', ephemeral: true });
        }
        if (targetUser.bot) {
            return interaction.reply({ content: '❌ Bot tidak membutuhkan badge!', ephemeral: true });
        }

        try {
            // 2. Ambil Profil Pengirim (Sender)
            let [senderProfile] = await UserProfile.findOrCreate({ 
                where: { guildId, userId: senderId } 
            });
            
            const senderBadges = senderProfile.badges || [];

            if (senderBadges.length === 0) {
                return interaction.reply({ content: '❌ Kamu tidak memiliki badge apapun untuk diberikan.', ephemeral: true });
            }

            // 3. Ambil Detail Badge dari Database
            const ownedBadgesData = await Badge.findAll({ where: { id: senderBadges } });

            // 4. Siapkan Dropdown Menu
            const options = ownedBadgesData.slice(0, 25).map(badge => {
                return new StringSelectMenuOptionBuilder()
                    .setLabel(badge.name)
                    .setValue(badge.id.toString())
                    .setEmoji(badge.emojiId); // Memunculkan icon badge di dropdown
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('user_gift_badge')
                .setPlaceholder('Pilih badge milikmu yang ingin dikirim...')
                .setMinValues(1)
                .setMaxValues(options.length) // Bisa kirim banyak sekaligus
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = await interaction.reply({ 
                content: `Pilih badge milikmu yang ingin dipindahtangankan kepada ${targetUser}: \n*(Peringatan: Badge yang dikirim akan hilang dari profilmu!)*`, 
                components: [row], 
                ephemeral: true 
            });

            // 5. Tangkap Pilihan User (Event Collector)
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.StringSelect, 
                time: 60000 
            });

            collector.on('collect', async (i) => {
                // Pastikan yang nge-klik dropdown adalah pengirimnya
                if (i.user.id !== senderId) return;

                const selectedBadgeIds = i.values.map(id => parseInt(id));

                // Ambil profil target (Penerima)
                let [targetProfile] = await UserProfile.findOrCreate({ 
                    where: { guildId, userId: targetUser.id } 
                });
                let targetCurrentBadges = targetProfile.badges || [];

                // 6. Filter Badge (Mencegah pengiriman badge yang sudah dimiliki target)
                const badgesToTransfer = [];
                for (const badgeId of selectedBadgeIds) {
                    if (!targetCurrentBadges.includes(badgeId)) {
                        badgesToTransfer.push(badgeId);
                    }
                }

                if (badgesToTransfer.length === 0) {
                    return i.update({ content: `❌ Batal transfer! ${targetUser.username} sudah memiliki badge yang kamu pilih.`, components: [] });
                }

                // ================= PROSES TRANSFER DATA =================
                
                // A. HAPUS DARI PENGIRIM (SENDER)
                senderProfile.badges = senderProfile.badges.filter(id => !badgesToTransfer.includes(id));
                
                // Mencegah "Ghost Badge": Jika sender memajang badge ini di Canvas, hapus juga dari display
                let senderDisplayed = senderProfile.displayedBadges || [];
                senderProfile.displayedBadges = senderDisplayed.filter(id => !badgesToTransfer.includes(id));
                
                senderProfile.changed('badges', true);
                senderProfile.changed('displayedBadges', true);
                await senderProfile.save();

                // B. TAMBAHKAN KE PENERIMA (TARGET)
                targetCurrentBadges.push(...badgesToTransfer);
                targetProfile.badges = targetCurrentBadges;
                targetProfile.changed('badges', true);
                await targetProfile.save();

                // ========================================================

                // Ambil nama badge untuk pengumuman
                const transferredBadgeData = ownedBadgesData.filter(b => badgesToTransfer.includes(b.id));
                const badgeNames = transferredBadgeData.map(b => `${b.emojiFormat} **${b.name}**`);

                // Tutup menu dropdown pengirim
                await i.update({ content: `✅ Berhasil mentransfer ${badgesToTransfer.length} badge ke ${targetUser.username}!`, components: [] });

                // 7. Kirim Pengumuman Publik
                const embed = new EmbedBuilder()
                    .setColor('#95A5A6') // Warna oranye (Trade)
                    .setTitle('🤝 Transfer Badge Berhasil!')
                    .setDescription(`${interaction.user} telah dengan ikhlas memberikan **${badgesToTransfer.length} badge** miliknya kepada ${targetUser}!\n\n**Badge yang berpindah tangan:**\n${badgeNames.join('\n')}`)
                    .setFooter({ text: 'Hak milik badge telah resmi berpindah.' });

                await interaction.channel.send({ content: `${targetUser}`, embeds: [embed] });
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ content: 'Waktu pemilihan habis. Silakan ketik command lagi.', components: [] }).catch(() => {});
                }
            });

        } catch (error) {
            console.error(`[ERROR] Gagal mengeksekusi /giftbadge:`, error);
            await interaction.reply({ content: '❌ Terjadi kesalahan saat memproses transfer.', ephemeral: true });
        }
    }
}

module.exports = GiftBadgeCommand;