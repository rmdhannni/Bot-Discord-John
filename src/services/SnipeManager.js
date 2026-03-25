const { Collection } = require('discord.js');

class SnipeManager {
    constructor() {
        // Menyimpan pesan dengan format: Collection<ChannelID, Array<MessageData>>
        this.snipes = new Collection();
    }

    /**
     * Menyimpan pesan yang baru saja dihapus
     * @param {Object} message - Objek pesan dari Discord
     */
    addSnipe(message) {
        // Abaikan jika pesan tidak memiliki konten atau author (misal: embed sistem)
        if (!message.content && message.embeds.length === 0) return;
        // Abaikan pesan dari bot lain untuk menghindari spam
        if (message.author?.bot) return;

        const channelId = message.channel.id;
        let channelSnipes = this.snipes.get(channelId) || [];

        // Simpan data esensial dari pesan
        const snipeData = {
            content: message.content,
            author: message.author,
            image: message.attachments.first() ? message.attachments.first().proxyURL : null,
            timestamp: Date.now()
        };

        // Masukkan pesan ke urutan paling atas (index 0)
        channelSnipes.unshift(snipeData);

        // Batasi hanya menyimpan 5 pesan terakhir per channel agar RAM tidak penuh (Clean Code / Optimasi)
        if (channelSnipes.length > 5) {
            channelSnipes.pop();
        }

        this.snipes.set(channelId, channelSnipes);
    }

    /**
     * Mengambil pesan yang dihapus di channel tertentu
     * @param {string} channelId - ID dari channel
     * @param {number} index - Urutan pesan (0 untuk paling baru)
     * @returns {Object|null} - Data pesan atau null jika tidak ada
     */
    getSnipe(channelId, index = 0) {
        const channelSnipes = this.snipes.get(channelId);
        if (!channelSnipes || channelSnipes.length <= index) return null;
        
        return channelSnipes[index];
    }
}

module.exports = SnipeManager;