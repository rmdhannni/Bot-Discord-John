const CommandPermission = require('../../models/CommandPermission');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(interaction, client) {
        // Abaikan jika bukan slash command
        if (!interaction.isChatInputCommand()) return;

        // Cari file command berdasarkan namanya
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            // ==========================================================
            // 🛡️ GATEKEEPER 1: CEK PERMISSION DISCORD DARI COMMAND DEFINITION
            // ==========================================================
            // Jika command mendeklarasikan permissions (misal: Administrator),
            // pastikan user memiliki semua permission tersebut.
            if (command.permissions && command.permissions.length > 0) {
                const missingPerms = command.permissions.filter(perm => 
                    !interaction.member.permissions.has(perm)
                );

                if (missingPerms.length > 0) {
                    return interaction.reply({
                        content: `🚫 **Akses Ditolak!** Command \`/${interaction.commandName}\` hanya bisa digunakan oleh **Admin** server.`,
                        ephemeral: true
                    });
                }
            }
            // ==========================================================

            // ==========================================================
            // 🛡️ GATEKEEPER 2: CEK CUSTOM PERMISSION DARI DATABASE
            // ==========================================================
            // Abaikan pengecekan jika user adalah Administrator (Admin bebas pakai apa saja)
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                
                const permData = await CommandPermission.findOne({
                    where: { guildId: interaction.guild.id, commandName: interaction.commandName }
                });

                // Jika command ini punya batasan role di database (Array tidak kosong)
                if (permData && permData.allowedRoles && permData.allowedRoles.length > 0) {
                    
                    // Cek apakah member memiliki setidaknya satu dari role yang diizinkan
                    const hasAccess = interaction.member.roles.cache.some(role => permData.allowedRoles.includes(role.id));

                    if (!hasAccess) {
                        return interaction.reply({ 
                            content: `🔒 Akses Ditolak! Kamu tidak memiliki role yang dibutuhkan untuk menggunakan \`/${interaction.commandName}\`.`, 
                            ephemeral: true 
                        });
                    }
                }
            }
            // ==========================================================

            // Jika lolos dari penjaga gerbang, jalankan command-nya
            await command.execute(interaction);

        } catch (error) {
            console.error(`[ERROR] Terjadi kesalahan saat menjalankan /${interaction.commandName}:`, error);
            
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: '❌ Terjadi kesalahan saat mengeksekusi command ini!', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ Terjadi kesalahan atau bot terlalu lambat merespons!', ephemeral: true });
                }
            } catch (err) {
                // Abaikan error jika interaksi memang sudah benar-benar mati di sisi Discord
                if (err.code === 10062 || err.code === 40060) {
                    console.warn(`[WARN] Gagal mengirim pesan balasan error karena interaksi sudah kedaluwarsa untuk /${interaction.commandName}.`);
                } else {
                    console.error('[ERROR] Gagal mengirim pesan error cadangan:', err);
                }
            }
        }
    }
};