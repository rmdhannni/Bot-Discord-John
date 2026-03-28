const BaseCommand = require('../../structures/BaseCommand');
const GuildConfig = require('../../models/GuildConfig');
const BoosterUser = require('../../models/BoosterUser');
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

class PcCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'pc',
            description: 'Kelola Personal Channel kamu (Khusus Booster!).',
            category: 'Booster',
            options: [
                {
                    name: 'create',
                    description: 'Buat Personal Channel milikmu sendiri',
                    type: 1 // SUB_COMMAND
                },
                {
                    name: 'delete',
                    description: 'Hapus Personal Channel milikmu',
                    type: 1 // SUB_COMMAND
                },
                {
                    name: 'rename',
                    description: 'Ubah nama Personal Channel kamu',
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'nama_baru',
                            description: 'Nama baru untuk channel kamu',
                            type: 3, // STRING
                            required: true
                        }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const member = interaction.member;

        try {
            // 1. Ambil konfigurasi server
            const config = await GuildConfig.findOne({ where: { guildId } });
            if (!config || !config.boosterRoleId) {
                return interaction.reply({ 
                    content: '❌ Admin belum mengatur Role Booster di server ini (`/setup booster`).', 
                    ephemeral: true 
                });
            }

            // 2. Validasi: Apakah user ini benar-benar memiliki role Booster?
            if (!member.roles.cache.has(config.boosterRoleId)) {
                return interaction.reply({ 
                    content: '💎 Command ini eksklusif hanya untuk Server Booster!', 
                    ephemeral: true 
                });
            }

            // 3. Ambil atau buat data Booster di database
            let [boosterData] = await BoosterUser.findOrCreate({
                where: { guildId, userId }
            });

            // ================= LOGIKA SUB-COMMANDS =================

            if (subCommand === 'create') {
                // Cek jika sudah punya PC
                if (boosterData.personalChannelId) {
                    const existingChannel = interaction.guild.channels.cache.get(boosterData.personalChannelId);
                    if (existingChannel) {
                        return interaction.reply({ content: `Kamu sudah memiliki Personal Channel di <#${boosterData.personalChannelId}>!`, ephemeral: true });
                    }
                }

                // Buat Channel Baru
                const newChannel = await interaction.guild.channels.create({
                    name: `🎀・${interaction.user.username}-lounge`,
                    type: ChannelType.GuildText,
                    parent: config.boosterCategoryId || null, // Masukkan ke kategori khusus jika disetup admin
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id, // @everyone
                            deny: [PermissionFlagsBits.SendMessages], // Orang lain cuma bisa baca, gak bisa ketik
                        },
                        {
                            id: userId, // Pemilik PC
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ManageMessages, // Bisa hapus pesan orang di channelnya
                                PermissionFlagsBits.ManageChannels  // Bisa ubah nama/deskripsi channel
                            ],
                        },
                    ],
                });

                // Simpan ID channel ke database
                boosterData.personalChannelId = newChannel.id;
                await boosterData.save();

                const embed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('🎉 Personal Channel Dibuat!')
                    .setDescription(`Channel kamu siap digunakan: ${newChannel}\nKamu memiliki akses penuh untuk mengatur channel ini.`);

                await interaction.reply({ embeds: [embed] });
            }

            else if (subCommand === 'delete') {
                if (!boosterData.personalChannelId) {
                    return interaction.reply({ content: 'Kamu belum memiliki Personal Channel.', ephemeral: true });
                }

                const channelToDelete = interaction.guild.channels.cache.get(boosterData.personalChannelId);
                if (channelToDelete) {
                    await channelToDelete.delete('Booster menghapus PC mereka sendiri');
                }

                // Hapus ID dari database
                boosterData.personalChannelId = null;
                await boosterData.save();

                await interaction.reply({ content: '🗑️ Personal Channel kamu berhasil dihapus.', ephemeral: true });
            }

            else if (subCommand === 'rename') {
                if (!boosterData.personalChannelId) {
                    return interaction.reply({ content: 'Kamu belum memiliki Personal Channel.', ephemeral: true });
                }

                const channelToRename = interaction.guild.channels.cache.get(boosterData.personalChannelId);
                const newName = interaction.options.getString('nama_baru');

                if (channelToRename) {
                    await channelToRename.setName(newName);
                    await interaction.reply({ content: `✅ Nama channel diubah menjadi **${newName}**`, ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Channel tidak ditemukan (mungkin sudah terhapus).', ephemeral: true });
                }
            }

        } catch (error) {
            console.error(`[ERROR] Gagal menjalankan /pc di ${guildId}:`, error);
            await interaction.reply({ content: 'Terjadi kesalahan sistem.', ephemeral: true });
        }
    }
}

module.exports = PcCommand;