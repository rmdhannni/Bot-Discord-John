const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const foldersPath = path.join(__dirname, 'src', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Looping untuk membaca semua folder (admin, booster, user, utility)
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const CommandClass = require(filePath);
        
        // Kita instansiasi class dengan dummy object {} karena kita hanya butuh properti datanya
        const commandInstance = new CommandClass({});

        // Masukkan format JSON yang diminta Discord API ke dalam array
        commands.push({
            name: commandInstance.name,
            description: commandInstance.description,
            options: commandInstance.options || []
        });
    }
}

// Inisialisasi REST module Discord
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`[DEPLOY] Memulai proses registrasi ${commands.length} Slash Commands...`);

        // PENTING: Untuk masa development, kita daftarkan ke spesifik server (GUILD_ID) agar instan.
        // Jika sudah rilis publik, ganti menjadi Routes.applicationCommands(CLIENT_ID)
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`[DEPLOY] 🎉 Sukses! ${data.length} commands berhasil didaftarkan ke Discord.`);
    } catch (error) {
        console.error(`[FATAL ERROR] Gagal mendaftarkan command:`, error);
    }
})();