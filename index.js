require('dotenv').config(); // Memuat environment variables dari .env
const BotClient = require('./src/structures/BotClient');

// Inisialisasi client bot kita
const client = new BotClient();

// Nyalakan bot menggunakan token dari .env
client.start(process.env.DISCORD_TOKEN);

// Tangkap error global agar bot tidak mati mendadak jika ada bug tak terduga
process.on('unhandledRejection', error => {
    console.error('[FATAL GLOBAL ERROR] Unhandled Rejection:', error);
});
process.on('uncaughtException', error => {
    console.error('[FATAL GLOBAL ERROR] Uncaught Exception:', error);
});