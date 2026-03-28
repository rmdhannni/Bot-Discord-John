'use strict';

const BaseCommand          = require('../../structures/BaseCommand');
const UserProfile          = require('../../models/UserProfile');
const Badge                = require('../../models/Badge');
const Achievement          = require('../../models/Achievement');
const ProfileCardRenderer  = require('../../utils/Profilecardrenderer');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { Op }               = require('sequelize');

// ═════════════════════════════════════════════
//  Class: ProfileDataLoader
//  Tanggung jawab: mengambil & menyiapkan data
//  dari database sebelum dikirim ke renderer.
// ═════════════════════════════════════════════
class ProfileDataLoader {
    constructor(guildId, userId) {
        this.guildId = guildId;
        this.userId  = userId;
    }

    async fetchProfile() {
        const [profile] = await UserProfile.findOrCreate({
            where: { guildId: this.guildId, userId: this.userId },
        });
        return profile;
    }

    async fetchBadges(badgeIds = []) {
        if (!badgeIds.length) return [];
        return Badge.findAll({ where: { id: { [Op.in]: badgeIds } } });
    }

    async fetchDisplayedAchievements(codes = []) {
        if (!codes.length) return [];
        return Achievement.findAll({
            where: { guildId: this.guildId, code: { [Op.in]: codes } },
        });
    }

    async fetchGlobalRank(userXp = 0) {
        const higher = await UserProfile.count({
            where: { guildId: this.guildId, xp: { [Op.gt]: userXp } },
        });
        return higher + 1;
    }

    async loadAll() {
        const profile = await this.fetchProfile();
        const [badges, achievements, globalRank] = await Promise.all([
            this.fetchBadges(profile.badges || []),
            this.fetchDisplayedAchievements(profile.displayedAchievements || []),
            this.fetchGlobalRank(profile.xp),
        ]);
        return { profile, badges, achievements, globalRank };
    }
}

// ═════════════════════════════════════════════
//  Class: ProfileCommand
//  Tanggung jawab: menangani slash command
//  /profile dan mengirim hasilnya ke Discord.
// ═════════════════════════════════════════════
class ProfileCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: 'profile',
            description: 'Lihat kartu nama, level, XP, badge, dan pencapaian kamu.',
            category: 'User',
            options: [
                {
                    name: 'user',
                    description: 'Lihat profil user lain (kosongkan untuk melihat profil sendiri)',
                    type: 6,
                    required: false,
                },
            ],
        });
    }

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId    = interaction.guild.id;

        try {
            const loader = new ProfileDataLoader(guildId, targetUser.id);
            const { profile, badges, achievements, globalRank } = await loader.loadAll();

            const renderer = new ProfileCardRenderer({
                user: targetUser,
                profile,
                badges,
                achievements,
                globalRank,
                chatRank: globalRank,
            });

            const imageBuffer = await renderer.render();
            const attachment  = new AttachmentBuilder(imageBuffer, { name: 'profile-card.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error(`[ProfileCommand] Gagal render /profile untuk ${targetUser.tag}:`, error);
            await this._sendErrorReply(interaction);
        }
    }

    async _sendErrorReply(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x95A5A6)
            .setTitle('❌ Gagal Memuat Profil')
            .setDescription(
                'Terjadi kesalahan saat memproses kartu profil.\n' +
                'Pastikan URL background yang kamu atur masih valid.'
            )
            .setFooter({ text: 'Hubungi admin jika masalah terus berlanjut.' });

        await interaction.editReply({ embeds: [embed] }).catch(() => {});
    }
}

module.exports = ProfileCommand;