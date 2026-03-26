const BaseCommand = require('../../structures/BaseCommand');
const UserProfile = require('../../models/UserProfile');
const Achievement = require('../../models/Achievement'); // PENTING: Import model baru
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ComponentType 
} = require('discord.js');

class AchievementsCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'achievements',
            description: 'Pilih achievement yang ingin kamu pamerkan di profilmu.',
            category: 'User'
        });
    }

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        try {
            // 1. Ambil data profil user
            let [userProfile] = await UserProfile.findOrCreate({
                where: { guildId, userId }
            });

            const unlockedCodes = userProfile.achievements || [];
            const displayedCodes = userProfile.displayedAchievements || [];

            // Jika user belum punya achievement sama sekali
            if (unlockedCodes.length === 0) {
                return interaction.reply({ 
                    content: '❌ Kamu belum memiliki Achievement apapun. Aktiflah di server atau donasi untuk mendapatkannya!', 
                    ephemeral: true 
                });
            }

            // 2. Ambil detail Achievement dari Database berdasarkan kode yang dimiliki user
            const unlockedData = await Achievement.findAll({
                where: { guildId: guildId, code: unlockedCodes }
            });

            if (unlockedData.length === 0) {
                return interaction.reply({ 
                    content: '⚠️ Data achievement-mu tidak sinkron dengan server. Silakan hubungi Admin.', 
                    ephemeral: true 
                });
            }

            // 3. Buat Menu Dropdown
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_achievements')
                .setPlaceholder('Pilih maksimal 3 achievement...')
                .setMinValues(0) 
                .setMaxValues(Math.min(3, unlockedData.length)); 

            // 4. Masukkan opsi ke Dropdown dari data MySQL
            for (const ach of unlockedData) {
                const option = new StringSelectMenuOptionBuilder()
                    .setLabel(ach.label)
                    .setDescription(ach.description || 'Tidak ada deskripsi')
                    .setValue(ach.code)
                    .setDefault(displayedCodes.includes(ach.code)); 

                if (ach.emoji) option.setEmoji(ach.emoji);

                selectMenu.addOptions(option);
            }

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🏅 Lemari Achievement')
                .setDescription('Pilih **maksimal 3 achievement** dari dropdown di bawah ini untuk ditampilkan di Kartu Nama kamu.');

            const response = await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                ephemeral: true 
            });

            // 5. EVENT COLLECTOR
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.StringSelect, 
                time: 60000 
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== userId) {
                    return i.reply({ content: 'Ini bukan menumu!', ephemeral: true });
                }

                const selectedAchievements = i.values; 

                userProfile.displayedAchievements = selectedAchievements;
                userProfile.changed('displayedAchievements', true);
                await userProfile.save();

                const successEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setDescription(`✅ Berhasil memperbarui tampilan! **${selectedAchievements.length}** achievement akan ditampilkan di profilmu.`);

                await i.update({ embeds: [successEmbed], components: [] });
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ content: 'Waktu pemilihan telah habis.', components: [] }).catch(() => {});
                }
            });

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan /achievements:`, error);
            await interaction.reply({ content: '❌ Terjadi kesalahan sistem.', ephemeral: true });
        }
    }
}

module.exports = AchievementsCommand;