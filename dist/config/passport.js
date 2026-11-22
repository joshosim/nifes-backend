"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGoogleOAuthConfigured = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const database_1 = require("./database");
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;
exports.isGoogleOAuthConfigured = Boolean(googleClientId && googleClientSecret && googleCallbackUrl);
if (exports.isGoogleOAuthConfigured) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
        passReqToCallback: true,
    }, async (req, accessToken, refreshToken, profile, done) => {
        const verifiedEmail = profile.emails
            ?.find((email) => email.verified)
            ?.value.trim()
            .toLowerCase();
        const googleId = profile.id.trim();
        if (!verifiedEmail) {
            return done(null, false, { code: 'GOOGLE_EMAIL_NOT_VERIFIED' });
        }
        if (!googleId) {
            return done(null, false, { code: 'GOOGLE_ID_MISSING' });
        }
        try {
            const name = profile.displayName.trim() || verifiedEmail.split('@')[0];
            const avatar = profile.photos?.[0]?.value;
            const state = typeof req.query.state === 'string' ? req.query.state : '';
            const requestedRole = state.endsWith('.MENTOR') ? 'MENTOR' : 'USER';
            const [linkedUser, emailMatches] = await Promise.all([
                database_1.prisma.user.findUnique({ where: { googleId } }),
                database_1.prisma.user.findMany({
                    where: { email: { equals: verifiedEmail, mode: 'insensitive' } },
                    take: 2,
                }),
            ]);
            if (linkedUser) {
                if (emailMatches.some((user) => user.id !== linkedUser.id)) {
                    return done(null, false, { code: 'GOOGLE_ACCOUNT_LINK_CONFLICT' });
                }
                return done(null, linkedUser);
            }
            if (emailMatches.length > 1) {
                return done(null, false, { code: 'GOOGLE_ACCOUNT_LINK_CONFLICT' });
            }
            const existingUser = emailMatches[0];
            if (existingUser) {
                if (existingUser.googleId && existingUser.googleId !== googleId) {
                    return done(null, false, { code: 'GOOGLE_ACCOUNT_LINK_CONFLICT' });
                }
                const user = await database_1.prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        googleId,
                        isVerified: true,
                        avatar: existingUser.avatar ?? avatar,
                        authProvider: existingUser.password ? existingUser.authProvider : 'google',
                    },
                });
                return done(null, user);
            }
            const user = await database_1.prisma.user.create({
                data: {
                    email: verifiedEmail,
                    name,
                    avatar,
                    googleId,
                    authProvider: 'google',
                    role: requestedRole,
                    isVerified: true,
                },
            });
            return done(null, user);
        }
        catch (error) {
            return done(error);
        }
    }));
}
else {
    console.warn('Google OAuth is disabled. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL to enable it.');
}
exports.default = passport_1.default;
