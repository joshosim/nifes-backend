"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGoogleOAuthConfigured = void 0;
const client_1 = require("@prisma/client");
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const prisma = new client_1.PrismaClient();
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;
exports.isGoogleOAuthConfigured = Boolean(googleClientId && googleClientSecret && googleCallbackUrl);
if (exports.isGoogleOAuthConfigured) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName;
            const avatar = profile.photos?.[0]?.value;
            const googleId = profile.id;
            if (!email) {
                return done(new Error('No email from Google'), undefined);
            }
            // Check if user already exists by googleId or email
            let user = await prisma.user.findFirst({
                where: {
                    OR: [{ googleId }, { email }],
                },
            });
            if (user) {
                // If exists by email but no googleId yet, link the account
                if (!user.googleId) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { googleId, authProvider: 'google', avatar },
                    });
                }
            }
            else {
                //to create a new user if not exists
                user = await prisma.user.create({
                    data: {
                        email,
                        name,
                        avatar,
                        googleId,
                        authProvider: 'google',
                        role: 'USER'
                    },
                });
            }
            return done(null, user);
        }
        catch (error) {
            return done(error, undefined);
        }
    }));
}
else {
    console.warn('Google OAuth is disabled. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL to enable it.');
}
exports.default = passport_1.default;
