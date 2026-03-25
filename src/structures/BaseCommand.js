class BaseCommand {
    constructor(client, options = {}) {
        this.client = client;
        this.name = options.name || 'unnamed';
        this.description = options.description || 'Tidak ada deskripsi.';
        this.category = options.category || 'Utilitas';
        this.permissions = options.permissions || [];
        this.options = options.options || []; // Untuk argumen slash command
    }

    /**
     * Method ini WAJIB di-override oleh command yang mewarisinya.
     * @param {Object} interaction - Discord interaction object
     */
    async execute(interaction) {
        throw new Error(`Command ${this.name} tidak memiliki method execute()!`);
    }
}

module.exports = BaseCommand;