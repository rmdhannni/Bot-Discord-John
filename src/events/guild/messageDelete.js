module.exports = {
    name: 'messageDelete',
    once: false, // Berjalan berkali-kali setiap ada pesan dihapus
    
    execute(message, client) {
        // Pastikan kita memanggil method addSnipe dari manager yang ada di client
        if (client.snipeManager) {
            client.snipeManager.addSnipe(message);
        }
    }
};