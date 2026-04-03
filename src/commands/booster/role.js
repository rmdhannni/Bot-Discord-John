const BaseCommand = require('../../structures/BaseCommand');
const GuildConfig = require('../../models/GuildConfig');
const BoosterUser = require('../../models/BoosterUser');
const { EmbedBuilder } = require('discord.js');

class RoleCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'role',
            description: 'Kelola Custom Role eksklusif milikmu (Khusus Booster!).',
            category: 'Booster',
            options: [
                {
                    name: 'create',
                    description: 'Buat Custom Role baru',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'nama',
                            description: 'Nama untuk role kamu',
                            type: 3, // STRING
                            required: true
                        },
                        {
                            name: 'warna',
                            description: 'Kode warna HEX (contoh: #FF5733)',
                            type: 3, // STRING
                            required: true
                        }
                    ]
                },
                {
                    name: 'edit',
                    description: 'Ubah nama atau warna Custom Role kamu',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'nama',
                            description: 'Nama baru (kosongkan jika tidak ingin diubah)',
                            type: 3,
                            required: false
                        },
                        {
                            name: 'warna',
                            description: 'Warna HEX baru (kosongkan jika tidak ingin diubah)',
                            type: 3,
                            required: false
                        }
                    ]
                },
                {
                    name: 'delete',
                    description: 'Hapus Custom Role kamu secara permanen',
                    type: 1 // SUB_COMMAND
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const member = interaction.member;

        try {
            // 1. Validasi Akses Booster
            const config = await GuildConfig.findOne({ where: { guildId: guild.id } });
            if (!config || !config.boosterRoleId) {
                return interaction.reply({ content: '❌ Sistem Booster belum di-setup oleh Admin.', ephemeral: true });
            }
            if (!member.roles.cache.has(config.boosterRoleId)) {
                return interaction.reply({ content: '💎 Fitur ini khusus untuk Server Booster!', ephemeral: true });
            }

            // 2. Ambil data user dari Database
            let [boosterData] = await BoosterUser.findOrCreate({
                where: { guildId: guild.id, userId: member.id }
            });

            // ================= LOGIKA CREATE =================
            if (subCommand === 'create') {
                if (boosterData.customRoleId && guild.roles.cache.has(boosterData.customRoleId)) {
                    return interaction.reply({ content: 'Kamu sudah memiliki Custom Role! Gunakan `/role edit` untuk mengubahnya.', ephemeral: true });
                }

                const namaRole = interaction.options.getString('nama');
                const warnaRole = interaction.options.getString('warna');

                // Regex sederhana untuk validasi format warna HEX
                if (!/^#[0-9A-F]{6}$/i.test(warnaRole)) {
                    return interaction.reply({ content: 'Format warna tidak valid! Gunakan format HEX (contoh: #FFFFFF).', ephemeral: true });
                }

                // Buat role di Discord
                const newRole = await guild.roles.create({
                    name: namaRole,
                    color: warnaRole,
                    reason: `Booster Custom Role untuk ${member.user.tag}`,
                    // Posisikan role di bawah role bot agar bot bisa mengelolanya
                    position: guild.members.me.roles.highest.position - 1 
                });

                // Berikan role ke user
                await member.roles.add(newRole);

                // Simpan ke database
                boosterData.customRoleId = newRole.id;
                await boosterData.save();

                const embed = new EmbedBuilder()
                    .setColor(warnaRole)
                    .setTitle('🎭 Identitas Palsu Berhasil Dibuat!')
                    .setDescription(`Penyamaran ${newRole} telah ditambahkan ke data dirimu.`);

                await interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA EDIT =================
            else if (subCommand === 'edit') {
                if (!boosterData.customRoleId || !guild.roles.cache.has(boosterData.customRoleId)) {
                    return interaction.reply({ content: 'Kamu belum memiliki Custom Role! Buat dulu dengan `/role create`.', ephemeral: true });
                }

                const roleToEdit = guild.roles.cache.get(boosterData.customRoleId);
                const namaBaru = interaction.options.getString('nama');
                const warnaBaru = interaction.options.getString('warna');

                if (!namaBaru && !warnaBaru) {
                    return interaction.reply({ content: 'Kamu harus memasukkan setidaknya nama atau warna baru yang ingin diubah.', ephemeral: true });
                }

                let updateData = {};
                if (namaBaru) updateData.name = namaBaru;
                if (warnaBaru) {
                    if (!/^#[0-9A-F]{6}$/i.test(warnaBaru)) {
                        return interaction.reply({ content: 'Format warna HEX tidak valid!', ephemeral: true });
                    }
                    updateData.color = warnaBaru;
                }

                await roleToEdit.edit(updateData, `Booster ${member.user.tag} mengedit role mereka`);

                const embed = new EmbedBuilder()
                    .setColor(warnaBaru || roleToEdit.color)
                    .setTitle('✏️ Identitas Diubah!')
                    .setDescription(`Penyamaran jalur bawah tanahmu sekarang: ${roleToEdit}`);

                await interaction.reply({ embeds: [embed] });
            }

            // ================= LOGIKA DELETE =================
            else if (subCommand === 'delete') {
                if (!boosterData.customRoleId) {
                    return interaction.reply({ content: 'Kamu tidak memiliki Custom Role untuk dihapus.', ephemeral: true });
                }

                const roleToDelete = guild.roles.cache.get(boosterData.customRoleId);
                if (roleToDelete) {
                    await roleToDelete.delete(`Booster ${member.user.tag} menghapus custom role mereka`);
                }

                boosterData.customRoleId = null;
                await boosterData.save();

                await interaction.reply({ content: '🗑️ Custom Role milikmu berhasil dihapus secara permanen.', ephemeral: true });
            }

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan /role di ${guild.id}:`, error);
            await interaction.reply({ content: 'Terjadi kesalahan sistem, pastikan bot memiliki izin `Manage Roles` dan posisinya berada di atas custom role kamu.', ephemeral: true });
        }
    }
}

module.exports = RoleCommand;