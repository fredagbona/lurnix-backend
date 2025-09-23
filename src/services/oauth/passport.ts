import type { Express } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import { config } from '../../config/environment.js';
import { NormalizedOAuthProfile, OAuthVerifyCallbackPayload } from './oauthTypes.js';

let configured = false;

function mapGoogleProfile(profile: GoogleProfile): NormalizedOAuthProfile {
  const primaryEmail = profile.emails?.[0];
  const email = primaryEmail?.value || null;
  const emailVerified = Boolean(
    primaryEmail?.verified ?? (profile._json as Record<string, unknown> | undefined)?.email_verified ?? false
  );
  const fullname =
    profile.displayName ||
    [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ').trim() ||
    profile.name?.givenName ||
    profile.id;
  const avatarUrl = profile.photos?.[0]?.value || null;
  const locale = (profile._json as Record<string, unknown> | undefined)?.locale as string | undefined;

  return {
    provider: 'google',
    providerUserId: profile.id,
    email,
    emailVerified,
    fullname,
    username: profile.username ?? (email ? email.split('@')[0] : null),
    avatarUrl,
    locale: locale ?? null,
    rawProfile: profile._json as Record<string, unknown> | undefined,
  };
}

function mapGithubProfile(profile: GitHubProfile): NormalizedOAuthProfile {
  const emails = profile.emails || [];
  const primaryEmail = emails.find(email => (email as any).primary) || emails[0];
  const emailValue = primaryEmail?.value || null;
  const emailVerified = Boolean((primaryEmail as any)?.verified ?? false);
  const displayName = profile.displayName || (profile._json as any)?.name || profile.username || 'GitHub User';
  const avatarUrl = (profile._json as any)?.avatar_url || profile.photos?.[0]?.value || null;

  return {
    provider: 'github',
    providerUserId: profile.id,
    email: emailValue,
    emailVerified,
    fullname: displayName,
    username: profile.username,
    avatarUrl,
    locale: (profile._json as any)?.locale ?? null,
    rawProfile: profile._json as Record<string, unknown> | undefined,
  };
}

function registerGoogleStrategy() {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    console.warn('[OAuth] Google credentials missing; Google strategy not registered.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
        passReqToCallback: false,
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const normalizedProfile = mapGoogleProfile(profile);
          const payload: OAuthVerifyCallbackPayload = {
            profile: normalizedProfile,
            accessToken,
            refreshToken: refreshToken || undefined,
          };
          return done(null, payload);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

function registerGithubStrategy() {
  if (!config.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET) {
    console.warn('[OAuth] GitHub credentials missing; GitHub strategy not registered.');
    return;
  }

  passport.use(
    new GitHubStrategy(
      {
        clientID: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        callbackURL: config.GITHUB_CALLBACK_URL,
        scope: ['user:email'],
        passReqToCallback: false,
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const normalizedProfile = mapGithubProfile(profile);
          const payload: OAuthVerifyCallbackPayload = {
            profile: normalizedProfile,
            accessToken,
            refreshToken: refreshToken || undefined,
          };
          return done(null, payload);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

export function initializePassport(): void {
  if (configured) {
    return;
  }

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj as Express.User);
  });

  registerGoogleStrategy();
  registerGithubStrategy();

  configured = true;
}

export { passport };
