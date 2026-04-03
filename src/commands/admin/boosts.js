const BaseCommand = require('../../structures/BaseCommand');
const BoosterUser = require('../../models/BoosterUser');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class BoostsCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'boosts',
            description: 'Manajemen manual jumlah boost member (Khusus Admin).',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'add',
                    description: 'Tambahkan jumlah boost virtual ke member',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih member', type: 6, required: true },
                        { name: 'jumlah', description: 'Berapa banyak boost yang ditambahkan?', type: 4, required: true }
                    ]
                },
                {
                    name: 'remove',
                    description: 'Kurangi jumlah boost dari member',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'user', description: 'Pilih member', type: 6, required: true },
                        { name: 'jumlah', description: 'Berapa banyak boost yang dikurangi?', type: 4, required: true }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const jumlah = interaction.options.getInteger('jumlah');
        const guildId = interaction.guild.id;

        try {
            // Cari data user di database, jika tidak ada, buat baru
            let [boosterData] = await BoosterUser.findOrCreate({
                where: { guildId: guildId, userId: targetUser.id }
            });

            // Ambil jumlah boost saat ini (default 0 jika null)
            let currentBoosts = boosterData.boostCount || 0;

            const embed = new EmbedBuilder().setTimestamp();

            if (subCommand === 'add') {
                boosterData.boostCount = currentBoosts + jumlah;
                await boosterData.save();

                embed.setColor('#95A5A6')
                     .setTitle('📈 Kontribusi Pembangunan (Boost) Ditambahkan!')
                     .setDescription(`Dikucurkan dana setara **${jumlah} boost** kepada ${targetUser}.\nCatatan partisipasi pembangunannya sekarang: **${boosterData.boostCount}**`);
            } 
            
            else if (subCommand === 'remove') {
                // Cegah agar jumlah boost tidak menjadi minus (angka negatif)
                boosterData.boostCount = Math.max(0, currentBoosts - jumlah);
                await boosterData.save();

                embed.setColor('#95A5A6')
                     .setTitle('📉 Catatan Pembangunan Dikurangi!')
                     .setDescription(`Dipangkas **${jumlah} boost** dari rekam jejak ${targetUser}.\nCatatan partisipasi pembangunannya sekarang: **${boosterData.boostCount}**`);
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan /boosts di ${guildId}:`, error);
            await interaction.reply({ content: 'Terjadi kesalahan saat menyimpan ke database.', ephemeral: true });
        }
    }
}

module.exports = BoostsCommand;