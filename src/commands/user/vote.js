const BaseCommand = require('../../structures/BaseCommand');
const { EmbedBuilder } = require('discord.js');
// Asumsi: Kita punya model UserModel untuk menyimpan tiket vote
// const UserModel = require('../../models/UserModel'); 

class VoteCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'vote',
            description: 'Dukung bot ini dan dapatkan hadiah premium!',
            category: 'User',
            options: [
                {
                    name: 'info',
                    description: 'Lihat link untuk vote dan status vote kamu saat ini',
                    type: 1 // SUB_COMMAND
                },
                {
                    name: 'claim',
                    description: 'Klaim hadiah premium dari hasil vote kamu',
                    type: 1 // SUB_COMMAND
                },
                {
                    name: 'donate',
                    description: 'Donasikan tiket vote kamu untuk server ini',
                    type: 1 // SUB_COMMAND
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const user = interaction.user;

        // Simulasi data dari Database (Nantinya diganti dengan query Sequelize)
        let tiketVote = 0; // await UserModel.findOne({ where: { userId: user.id } }).then(u => u.votes);

        try {
            // ================= LOGIKA VOTE INFO =================
            if (subCommand === 'info') {
                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('🗳️ Dukung Bot Kami!')
                    .setDescription('Dengan melakukan vote, kamu membantu bot ini berkembang dan kamu akan mendapatkan **Tiket Premium** sebagai hadiah!')
                    .addFields(
                        { name: '🔗 Link Vote', value: '[Klik di sini untuk Vote di Top.gg](https://top.gg/bot/ID_BOT_KAMU/vote)' },
                        { name: '🎟️ Tiket Vote Kamu', value: `**${tiketVote}** Tiket siap diklaim.` }
                    )
                    .setFooter({ text: 'Kamu bisa vote setiap 12 jam sekali!' });

                return interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA VOTE CLAIM =================
            if (subCommand === 'claim') {
                if (tiketVote <= 0) {
                    return interaction.reply({ 
                        content: '❌ Kamu tidak memiliki tiket vote yang bisa diklaim. Gunakan `/vote info` untuk melihat link vote!', 
                        ephemeral: true 
                    });
                }

                // Logika pengurangan tiket di database dan pemberian status premium ke user
                // userDB.votes -= 1;
                // userDB.isPremium = true;
                // await userDB.save();

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('🎉 Klaim Berhasil!')
                    .setDescription(`Terima kasih atas dukunganmu, ${user.username}!\nKamu telah menukarkan 1 tiket vote dan mendapatkan **Akses Premium** selama 24 jam.`);

                return interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA VOTE DONATE =================
            if (subCommand === 'donate') {
                if (tiketVote <= 0) {
                    return interaction.reply({ content: 'Kamu tidak memiliki tiket vote untuk didonasikan.', ephemeral: true });
                }

                // Logika menambah skor vote milik Guild/Server di database
                // guildDB.voteScore += 1;

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('💖 Donasi Vote Berhasil!')
                    .setDescription(`Kamu telah mendonasikan 1 tiket vote untuk server **${interaction.guild.name}**!`);

                return interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan /vote:`, error);
            await interaction.reply({ content: 'Terjadi kesalahan sistem.', ephemeral: true });
        }
    }
}

module.exports = VoteCommand;