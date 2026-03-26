const BaseCommand = require('../../structures/BaseCommand');
const CommandPermission = require('../../models/CommandPermission');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class PermissionCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'permission',
            description: 'Atur role mana yang boleh menggunakan command tertentu.',
            category: 'Admin',
            permissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'add',
                    description: 'Tambahkan izin role untuk command',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'nama_command', description: 'Ketik nama command tanpa garis miring (misal: badge)', type: 3, required: true },
                        { name: 'role', description: 'Pilih role yang diizinkan', type: 8, required: true }
                    ]
                },
                {
                    name: 'remove',
                    description: 'Cabut izin role dari command',
                    type: 1, // SUB_COMMAND
                    options: [
                        { name: 'nama_command', description: 'Ketik nama command', type: 3, required: true },
                        { name: 'role', description: 'Pilih role yang ingin dicabut', type: 8, required: true }
                    ]
                }
            ]
        });
    }

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const commandName = interaction.options.getString('nama_command').toLowerCase();
        const targetRole = interaction.options.getRole('role');
        const guildId = interaction.guild.id;

        // Cek apakah command yang diketik valid (ada di sistem bot)
        if (!this.client.commands.has(commandName)) {
            return interaction.reply({ content: `❌ Command \`${commandName}\` tidak ditemukan di dalam bot ini!`, ephemeral: true });
        }

        try {
            let [permData] = await CommandPermission.findOrCreate({
                where: { guildId, commandName }
            });

            let currentRoles = permData.allowedRoles || [];

            if (subCommand === 'add') {
                if (currentRoles.includes(targetRole.id)) {
                    return interaction.reply({ content: `❌ Role ${targetRole} sudah memiliki akses ke \`/${commandName}\`.`, ephemeral: true });
                }
                currentRoles.push(targetRole.id);
                permData.allowedRoles = currentRoles;
                permData.changed('allowedRoles', true);
                await permData.save();

                return interaction.reply({ content: `✅ Berhasil! Role ${targetRole} sekarang **DIIZINKAN** menggunakan command \`/${commandName}\`.` });
            }

            if (subCommand === 'remove') {
                if (!currentRoles.includes(targetRole.id)) {
                    return interaction.reply({ content: `❌ Role ${targetRole} memang tidak memiliki akses ke \`/${commandName}\`.`, ephemeral: true });
                }
                // Hapus role dari array
                permData.allowedRoles = currentRoles.filter(id => id !== targetRole.id);
                permData.changed('allowedRoles', true);
                await permData.save();

                return interaction.reply({ content: `🗑️ Berhasil! Izin Role ${targetRole} untuk command \`/${commandName}\` telah **DICABUT**.` });
            }
        } catch (error) {
            console.error('[ERROR] Gagal mengatur permission:', error);
            await interaction.reply({ content: '❌ Terjadi kesalahan pada database.', ephemeral: true });
        }
    }
}

module.exports = PermissionCommand;