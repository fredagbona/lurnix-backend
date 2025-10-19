import type { Express } from 'express';
import passport from 'passport';
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
} from 'passport-google-oauth20';
import {
  Strategy as GitHubStrategy,
  Profile as GitHubProfile,
} from 'passport-github2';
import { config } from '../../../config/environment.js';
import { NormalizedOAuthProfile, OAuthVerifyCallbackPayload } from './oauthTypes.js';

type GoogleRawProfile = GoogleProfile & {
  _json?: {
    email_verified?: boolean;
    locale?: string;
    picture?: string;
  };
};

type GitHubRawProfile = GitHubProfile & {
  _json?: {
    name?: string;
    avatar_url?: string;
    locale?: string;
  };
};

type StrategyDone = (error: any, user?: any, info?: any) => void;

let configured = false;

function mapGoogleProfile(profile: GoogleProfile): NormalizedOAuthProfile {
  const raw = (profile as GoogleRawProfile)._json ?? {};
  const primaryEmail = profile.emails?.[0];
  const email = primaryEmail?.value || null;
  const emailVerified = Boolean(primaryEmail?.verified ?? raw.email_verified ?? false);
  const fullname =
    profile.displayName ||
    [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ').trim() ||
    profile.name?.givenName ||
    profile.id;
  const avatarUrl = profile.photos?.[0]?.value || null;
  const locale = raw.locale;

  return {
    provider: 'google',
    providerUserId: profile.id,
    email,
    emailVerified,
    fullname,
    username: profile.username ?? (email ? email.split('@')[0] : null),
    avatarUrl,
    locale: locale ?? null,
    rawProfile: raw as Record<string, unknown>,
  };
}

function mapGithubProfile(profile: GitHubProfile): NormalizedOAuthProfile {
  const raw = (profile as GitHubRawProfile)._json ?? {};
  const emails = profile.emails || [];
  const primaryEmail = emails.find(email => (email as any).primary) || emails[0];
  const emailValue = primaryEmail?.value || null;
  const emailVerified = Boolean((primaryEmail as any)?.verified ?? false);
  const displayName = profile.displayName || raw.name || profile.username || 'GitHub User';
  const avatarUrl = raw.avatar_url || profile.photos?.[0]?.value || null;

  return {
    provider: 'github',
    providerUserId: profile.id,
    email: emailValue,
    emailVerified,
    fullname: displayName,
    username: profile.username,
    avatarUrl,
    locale: raw.locale ?? null,
    rawProfile: raw as Record<string, unknown>,
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
      },
      (
        accessToken: string,
        refreshToken: string,
        profile: GoogleProfile,
        done: StrategyDone,
      ) => {
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
      },
      (
        accessToken: string,
        refreshToken: string,
        profile: GitHubProfile,
        done: StrategyDone,
      ) => {
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
