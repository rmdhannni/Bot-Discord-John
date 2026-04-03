const BaseCommand = require('../../structures/BaseCommand');
const Mission = require('../../models/Mission');
const Badge = require('../../models/Badge');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class MissionAdminCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'mission_admin',
            description: 'Buat dan atur Misi (Quest) server dengan tenggat waktu.',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'create',
                    description: 'Buat misi baru',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'judul', description: 'Nama misi (misal: Pejuang Subuh)', type: 3, required: true },
                        { 
                            name: 'tipe', 
                            description: 'Jenis misi', 
                            type: 3, 
                            required: true,
                            choices: [
                                { name: 'Kirim Pesan Chat (Jumlah)', value: 'chat' },
                                { name: 'Aktif di Voice Channel (Menit)', value: 'voice' }
                            ]
                        },
                        { name: 'target', description: 'Angka target (misal: 100 pesan / 60 menit)', type: 4, required: true },
                        { 
                            name: 'tipe_hadiah', 
                            description: 'Bentuk hadiah', 
                            type: 3, 
                            required: true,
                            choices: [
                                { name: 'Berikan XP', value: 'xp' },
                                { name: 'Berikan Role', value: 'role' },
                                { name: 'Berikan Badge (Ketik ID Badge di value_hadiah)', value: 'badge' }
                            ]
                        },
                        { name: 'value_hadiah', description: 'Jumlah XP / ID Role yang di-tag / ID Badge', type: 3, required: true },
                        { name: 'durasi_jam', description: 'Misi berakhir dalam berapa jam?', type: 4, required: true },
                        { name: 'deskripsi', description: 'Penjelasan misi (opsional)', type: 3, required: false }
                    ]
                },
                {
                    name: 'list',
                    description: 'Lihat daftar misi yang sedang aktif',
                    type: 1 // SUB_COMMAND
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            // ================= LOGIKA CREATE =================
            if (subCommand === 'create') {
                const title = interaction.options.getString('judul');
                const type = interaction.options.getString('tipe');
                const target = interaction.options.getInteger('target');
                const rewardType = interaction.options.getString('tipe_hadiah');
                const rewardValue = interaction.options.getString('value_hadiah');
                const durasiJam = interaction.options.getInteger('durasi_jam');
                const description = interaction.options.getString('deskripsi') || 'Selesaikan misi ini sebelum waktunya habis!';

                // Validasi input khusus
                if (rewardType === 'role') {
                    // Cek apakah Admin mengetik tag Role dengan benar (<@&ID>)
                    const roleIdMatch = rewardValue.match(/\d+/);
                    if (!roleIdMatch || !interaction.guild.roles.cache.has(roleIdMatch[0])) {
                        return interaction.reply({ content: '❌ Invalid Role! Pastikan kamu me-mention Role-nya (contoh: @Member Aktif) di kolom `value_hadiah`.', ephemeral: true });
                    }
                } else if (rewardType === 'xp' && isNaN(rewardValue)) {
                    return interaction.reply({ content: '❌ Invalid XP! Jika tipe hadiah XP, `value_hadiah` harus berupa angka (contoh: 500).', ephemeral: true });
                } else if (rewardType === 'badge') {
                    // Validasi apakah ID badge valid
                    const badge = await Badge.findOne({ where: { guildId, id: rewardValue } });
                    if (!badge) {
                        return interaction.reply({ content: `❌ Invalid Badge ID! Gunakan command \`/badge give\` terlebih dahulu untuk melihat ID badge.`, ephemeral: true });
                    }
                }

                // Hitung Waktu Deadline
                const deadline = new Date();
                deadline.setHours(deadline.getHours() + durasiJam);

                // Simpan Misi ke Database
                await Mission.create({
                    guildId, title, description, type, target, rewardType, rewardValue, deadline
                });

                // Teks Output Bantuan
                const typeText = type === 'chat' ? `Kirim ${target} Pesan` : `Nongkrong di Voice ${target} Menit`;
                const rewardText = rewardType === 'xp' ? `${rewardValue} XP` : (rewardType === 'role' ? `Role ${rewardValue}` : `Badge ID: ${rewardValue}`);

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('📜 Bounty Baru Meluncur di Papan GCPD!')
                    .setDescription(`Komisaris baru saja merilis Target Operasi. Siap laksanakan!\n\n**${title}**\n*${description}*\n\n🎯 **Misi:** ${typeText}\n🎁 **Bayaran:** ${rewardText}\n⏳ **Target Waktu:** <t:${Math.floor(deadline.getTime() / 1000)}:F>`)
                    .setFooter({ text: 'Akses /missions dari terminalmu' });

                return interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA LIST =================
            if (subCommand === 'list') {
                const now = new Date();
                const activeMissions = await Mission.findAll({ 
                    where: { guildId, isActive: true } 
                });

                // Filter misi yang belum expired
                const validMissions = activeMissions.filter(m => new Date(m.deadline) > now);

                if (validMissions.length === 0) {
                    return interaction.reply({ content: 'TIdak ada misi yang aktif saat ini.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('📋 Arsip Target Operasi (Aktif)')
                    .setDescription(validMissions.map(m => `**${m.title}** (Kode Lapangan: ${m.id})\n⏳ Batas Eliminasi: <t:${Math.floor(new Date(m.deadline).getTime() / 1000)}:R>`).join('\n\n'));

                return interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('[ERROR] Gagal eksekusi mission_admin:', error);
            await interaction.reply({ content: '❌ Terjadi kesalahan saat membuat misi.', ephemeral: true });
        }
    }
}

module.exports = MissionAdminCommand;