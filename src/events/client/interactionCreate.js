module.exports = {
    name: 'interactionCreate',
    once: false,
    
    async execute(interaction, client) {
        // Jika yang memicu interaksi bukan Slash Command, abaikan
        if (!interaction.isChatInputCommand()) return;

        // Cari command di dalam memori bot berdasarkan nama yang diketik user
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            return interaction.reply({ content: 'Command tidak ditemukan atau sedang error.', ephemeral: true });
        }

        try {
            // Jalankan fungsi execute() yang ada di setiap file command kita
            await command.execute(interaction);
        } catch (error) {
            console.error(`[ERROR] Saat menjalankan command ${interaction.commandName}:`, error);
            const reply = { content: 'Terjadi kesalahan internal saat mengeksekusi command ini!', ephemeral: true };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }
};