'use strict';

const BaseCommand  = require('../../structures/BaseCommand');
const UserProfile  = require('../../models/UserProfile');
const { EmbedBuilder } = require('discord.js');

// ─────────────────────────────────────────────
//  Konstanta
// ─────────────────────────────────────────────
const ABOUT_MAX_LENGTH = 150;   // karakter maksimum bio
const ABOUT_MIN_LENGTH = 1;

// ═════════════════════════════════════════════
//  Class: AboutValidator
//  Tanggung jawab: validasi input teks bio
// ═════════════════════════════════════════════
class AboutValidator {
    constructor(text) {
        this.text = text?.trim() ?? '';
    }

    validate() {
        if (this.text.length < ABOUT_MIN_LENGTH) {
            return { valid: false, reason: 'Bio tidak boleh kosong.' };
        }
        if (this.text.length > ABOUT_MAX_LENGTH) {
            return { valid: false, reason: `Bio terlalu panjang! Maksimal **${ABOUT_MAX_LENGTH}** karakter (kamu: ${this.text.length}).` };
        }
        return { valid: true, reason: null };
    }
}

// ═════════════════════════════════════════════
//  Class: AboutCommand
//  Tanggung jawab: slash command /about
//  Sub-command:
//    /about set  <teks>  — atur bio baru
//    /about clear        — hapus bio
//    /about view         — lihat bio sendiri
// ═════════════════════════════════════════════
class AboutCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'about',
            description: 'Atur atau lihat bio/deskripsi profilmu.',
            category: 'User',
            options: [
                {
                    name: 'set',
                    description: `Atur bio profilmu (maks ${ABOUT_MAX_LENGTH} karakter)`,
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: 'teks',
                            description: 'Teks bio yang ingin ditampilkan di kartu profilmu',
                            type: 3, // STRING
                            required: true,
                            max_length: ABOUT_MAX_LENGTH,
                        },
                    ],
                },
                {
                    name: 'clear',
                    description: 'Hapus bio profilmu',
                    type: 1, // SUB_COMMAND
                },
                {
                    name: 'view',
                    description: 'Lihat bio profilmu saat ini',
                    type: 1, // SUB_COMMAND
                },
            ],
        });
    }

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'set':   return this._handleSet(interaction);
            case 'clear': return this._handleClear(interaction);
            case 'view':  return this._handleView(interaction);
        }
    }

    // ─── /about set ──────────────────────────────────────────────────────────────
    async _handleSet(interaction) {
        const rawText  = interaction.options.getString('teks');
        const validator = new AboutValidator(rawText);
        const { valid, reason } = validator.validate();

        if (!valid) {
            return interaction.reply({
                embeds: [this._errorEmbed(reason)],
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const [profile] = await UserProfile.findOrCreate({
                where: { guildId: interaction.guild.id, userId: interaction.user.id },
            });

            profile.about = validator.text;
            await profile.save();

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95A5A6)
                        .setTitle('✅ Bio Berhasil Diperbarui!')
                        .setDescription(`Bio profilmu sekarang:\n> ${validator.text}`)
                        .setFooter({ text: 'Bio akan tampil di kartu /profile kamu.' }),
                ],
            });
        } catch (error) {
            console.error(`[AboutCommand] Gagal set bio untuk ${interaction.user.tag}:`, error);
            await interaction.editReply({ embeds: [this._errorEmbed('Terjadi kesalahan. Coba lagi nanti.')] });
        }
    }

    // ─── /about clear ────────────────────────────────────────────────────────────
    async _handleClear(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const [profile] = await UserProfile.findOrCreate({
                where: { guildId: interaction.guild.id, userId: interaction.user.id },
            });

            profile.about = null;
            await profile.save();

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95A5A6)
                        .setDescription('🗑️ Bio profilmu telah dihapus.'),
                ],
            });
        } catch (error) {
            console.error(`[AboutCommand] Gagal clear bio untuk ${interaction.user.tag}:`, error);
            await interaction.editReply({ embeds: [this._errorEmbed('Terjadi kesalahan. Coba lagi nanti.')] });
        }
    }

    // ─── /about view ─────────────────────────────────────────────────────────────
    async _handleView(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const profile = await UserProfile.findOne({
                where: { guildId: interaction.guild.id, userId: interaction.user.id },
            });

            const bio = profile?.about ?? null;

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95A5A6)
                        .setTitle('📝 Bio Profilmu')
                        .setDescription(bio ? `> ${bio}` : '*Belum ada bio. Gunakan `/about set` untuk mengaturnya.*')
                        .setFooter({ text: `Maks ${ABOUT_MAX_LENGTH} karakter` }),
                ],
            });
        } catch (error) {
            console.error(`[AboutCommand] Gagal view bio untuk ${interaction.user.tag}:`, error);
            await interaction.editReply({ embeds: [this._errorEmbed('Terjadi kesalahan. Coba lagi nanti.')] });
        }
    }

    // ─── Helper embed error ───────────────────────────────────────────────────────
    _errorEmbed(message) {
        return new EmbedBuilder()
            .setColor(0x95A5A6)
            .setDescription(`❌ ${message}`);
    }
}

module.exports = AboutCommand;