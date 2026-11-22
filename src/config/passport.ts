import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from './database';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;

export const isGoogleOAuthConfigured = Boolean(
  googleClientId && googleClientSecret && googleCallbackUrl
);

if (isGoogleOAuthConfigured) {
  passport.use(
    new GoogleStrategy({
      clientID: googleClientId!,
      clientSecret: googleClientSecret!,
      callbackURL: googleCallbackUrl!,
      passReqToCallback: true,
    },
      async (req, accessToken, refreshToken, profile, done) => {
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
            prisma.user.findUnique({ where: { googleId } }),
            prisma.user.findMany({
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

            const user = await prisma.user.update({
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

          const user = await prisma.user.create({
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
        } catch (error) {
          return done(error);
        }
      }
    )
  );
} else {
  console.warn(
    'Google OAuth is disabled. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL to enable it.'
  );
}

export default passport;
