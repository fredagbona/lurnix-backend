export type OAuthProvider = 'google' | 'github';

export interface NormalizedOAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  fullname: string;
  username?: string | null;
  avatarUrl?: string | null;
  locale?: string | null;
  rawProfile?: Record<string, unknown>;
}

export interface OAuthVerifyCallbackPayload {
  profile: NormalizedOAuthProfile;
  accessToken: string;
  refreshToken?: string;
}
