const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const sequelize = require('../utils/database'); // Koneksi MySQL
const SnipeManager = require('../services/SnipeManager');

class BotClient extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent, 
                GatewayIntentBits.GuildMembers    
            ]
        });

        this.commands = new Collection();
        this.snipeManager = new SnipeManager();
    }

    // Fungsi otomatis membaca folder commands
    async loadCommands() {
        const commandsPath = path.join(__dirname, '../commands');
        const commandFolders = fs.readdirSync(commandsPath);

        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                const CommandClass = require(path.join(folderPath, file));
                const commandInstance = new CommandClass(this);
                this.commands.set(commandInstance.name, commandInstance);
            }
        }
        console.log(`[SYSTEM] Berhasil memuat ${this.commands.size} Commands.`);
    }

    // Fungsi otomatis membaca folder events
    async loadEvents() {
        const eventsPath = path.join(__dirname, '../events');
        const eventFolders = fs.readdirSync(eventsPath);

        for (const folder of eventFolders) {
            const folderPath = path.join(eventsPath, folder);
            const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            
            for (const file of eventFiles) {
                const event = require(path.join(folderPath, file));
                if (event.once) {
                    this.once(event.name, (...args) => event.execute(...args, this));
                } else {
                    this.on(event.name, (...args) => event.execute(...args, this));
                }
            }
        }
        console.log(`[SYSTEM] Berhasil memuat Events.`);
    }

    // Fungsi untuk inisialisasi Database MySQL
    async connectDatabase() {
        try {
            await sequelize.authenticate();
            console.log('[DATABASE] Berhasil terhubung ke MySQL.');
            
            // Model yang lama
            require('../models/GuildConfig');
            require('../models/BoosterUser');
            
            // 📍 TAMBAHKAN MODEL BARU INI
            require('../models/UserProfile');
            require('../models/Badge');
            require('../models/Achievement');
            require('../models/CommandPermission');
            require('../models/LevelReward');
            
            await sequelize.sync({ alter: true });
            console.log('[DATABASE] Semua tabel telah disinkronkan.');
        } catch (error) {
            console.error('[DATABASE] Gagal terhubung ke MySQL:', error);
        }
    }

    // Fungsi utama untuk menyalakan bot
    async start(token) {
        await this.connectDatabase();
        await this.loadCommands();
        await this.loadEvents();
        
        await this.login(token);
        console.log(`[SYSTEM] Bot ONLINE sebagai ${this.user.tag} 🚀`);
    }
}

module.exports = BotClient;