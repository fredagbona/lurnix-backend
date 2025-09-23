# OAuth2 Implementation Specifications - Lurnix Backend

## Overview
This document outlines the specifications for adding OAuth2 authentication (Google & GitHub) to the existing Lurnix backend system. The implementation will extend the current auth system without breaking existing functionality.

---

## 1. Environment Configuration

### Local Development Environment
```env
API_BASE_URL=http://localhost:5050/api
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_local_google_client_id
GOOGLE_CLIENT_SECRET=your_local_google_client_secret
GITHUB_CLIENT_ID=your_local_github_client_id
GITHUB_CLIENT_SECRET=your_local_github_client_secret
```

### Production Environment
```env
API_BASE_URL=https://api.lurnix.tech/api
FRONTEND_URL=https://lurnix.tech
GOOGLE_CLIENT_ID=your_prod_google_client_id
GOOGLE_CLIENT_SECRET=your_prod_google_client_secret
GITHUB_CLIENT_ID=your_prod_github_client_id
GITHUB_CLIENT_SECRET=your_prod_github_client_secret
```

---

## 2. OAuth Provider Configuration

### Google Cloud Console Setup

#### Local Development
- **Authorized redirect URIs**: `http://localhost:5050/api/auth/google/callback`
- **Authorized JavaScript origins**: `http://localhost:3000`

#### Production
- **Authorized redirect URIs**: `https://api.lurnix.tech/api/auth/google/callback`
- **Authorized JavaScript origins**: `https://lurnix.tech`

### GitHub OAuth Apps Setup

#### Local Development
- **Authorization callback URL**: `http://localhost:5050/api/auth/github/callback`
- **Homepage URL**: `http://localhost:3000`

#### Production
- **Authorization callback URL**: `https://api.lurnix.tech/api/auth/github/callback`
- **Homepage URL**: `https://lurnix.tech`

---

## 3. Database Schema Changes

### User Model Extensions
Add the following fields to the existing User model:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `googleId` | String | Google OAuth user ID | No |
| `githubId` | String | GitHub OAuth user ID | No |
| `providers` | Array[String] | List of linked auth providers | No |
| `avatar` | String | Profile picture URL from OAuth | No |

### Schema Modifications
- Make `password` field optional (OAuth users don't need passwords)
- Set `isEmailVerified` to `true` by default for OAuth users
- Add unique constraints on `googleId` and `githubId`

### Account Linking Logic
1. **Email Match**: If OAuth email matches existing user → link accounts
2. **New User**: If email is new → create account with `isEmailVerified: true`
3. **Provider Tracking**: Store provider-specific IDs for future authentication

---

## 4. Backend API Endpoints

### New OAuth Authentication Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/google` | Initiate Google OAuth flow |
| `GET` | `/api/auth/google/callback` | Handle Google OAuth callback |
| `GET` | `/api/auth/github` | Initiate GitHub OAuth flow |
| `GET` | `/api/auth/github/callback` | Handle GitHub OAuth callback |
| `POST` | `/api/auth/unlink/:provider` | Unlink OAuth provider from account |
| `GET` | `/api/auth/linked-accounts` | Get user's linked authentication providers |

### OAuth Callback Processing Flow
1. **Receive Data**: Get user profile from OAuth provider
2. **Email Verification**: Check if email exists in database
3. **Account Handling**:
   - **Existing Account**: Link provider to current user
   - **New Account**: Create user with verified email status
4. **Token Generation**: Create JWT token (consistent with existing auth)
5. **Redirect**: Send user to frontend with authentication token

### Response Format
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "providers": ["google", "email"],
      "isEmailVerified": true
    },
    "token": "jwt_token_here"
  }
}
```

---

## 5. Frontend Integration Specifications

### Environment Configuration
```javascript
// Local
NEXT_PUBLIC_API_URL=http://localhost:5050/api

// Production  
NEXT_PUBLIC_API_URL=https://api.lurnix.tech/api
```

### OAuth Authentication Flow
1. **Initiation**: User clicks "Login with Google/GitHub"
2. **Redirect**: Browser navigates to `${API_URL}/auth/{provider}`
3. **OAuth Process**: User completes OAuth on provider's site
4. **Callback**: Provider redirects to backend callback URL
5. **Frontend Redirect**: Backend redirects to `${FRONTEND_URL}/auth/success?token={jwt_token}`
6. **Token Storage**: Frontend extracts and stores JWT token
7. **Dashboard Access**: User is authenticated and can access protected routes

### UI/UX Requirements
- **Login Page**: Add OAuth provider buttons below existing login form
- **Profile Page**: Display linked accounts section
- **Account Management**: Allow users to link/unlink providers
- **Visual Indicators**: Show which authentication methods are active

---

## 6. Testing Strategy

### Local Development Testing
1. **Setup**: Configure local OAuth applications with localhost callbacks
2. **Flow Testing**: Complete end-to-end authentication flows
3. **Account Linking**: Test linking OAuth accounts to existing email accounts
4. **User Creation**: Verify new user account creation via OAuth
5. **Edge Cases**: Test cancellation, errors, and network issues

### Production Environment Testing
1. **Deployment**: Deploy with production OAuth credentials
2. **SSL Verification**: Ensure HTTPS callbacks work correctly
3. **Cross-Device Testing**: Test from multiple devices and networks
4. **Performance**: Monitor OAuth response times and success rates

### Critical Test Cases

#### Account Linking Scenarios
- OAuth email matches existing unverified email account
- OAuth email matches existing verified email account
- Multiple OAuth providers for same email address
- User attempts to unlink last authentication method

#### Error Scenarios
- User cancels OAuth authorization
- OAuth provider service is temporarily unavailable
- Invalid or expired OAuth tokens
- Network timeouts during OAuth process
- Malformed callback data from providers

---

## 7. Security Implementation

### Authentication Token Handling
- **Consistency**: Use identical JWT strategy as existing authentication
- **Security**: Implement secure cookie settings for production
- **CORS**: Configure proper cross-origin settings between domains

### Account Linking Security
- **Verification**: Require current password to link OAuth to existing accounts
- **Email Ownership**: Verify user owns email address before account linking
- **Minimum Auth**: Prevent unlinking if no alternative authentication method exists

### Error Handling Strategy
- **Graceful Degradation**: Maintain functionality if OAuth providers are unavailable
- **User Communication**: Provide clear, actionable error messages
- **Debug Logging**: Implement comprehensive logging for troubleshooting

---

## 8. Implementation Timeline

### Phase 1: Backend Development (Week 1-2)
- [ ] Install and configure OAuth libraries
- [ ] Create database migrations for user model changes
- [ ] Implement OAuth authentication routes
- [ ] Set up local OAuth applications for testing
- [ ] Create unit tests for OAuth functionality
- [ ] Validate existing authentication still functions

### Phase 2: Frontend Integration (Week 2-3)
- [ ] Design and implement OAuth login buttons
- [ ] Create authentication state management
- [ ] Build account linking/unlinking interface
- [ ] Implement error handling and user feedback
- [ ] Create comprehensive user flow testing

### Phase 3: Production Deployment (Week 3-4)
- [ ] Configure production OAuth applications
- [ ] Deploy backend changes with OAuth routes
- [ ] Deploy frontend changes with OAuth interfaces
- [ ] Implement monitoring and analytics
- [ ] Conduct thorough production testing
- [ ] Create user documentation and support materials

---



## 10. Risk Assessment and Mitigation

### Technical Risks
- **Provider Dependency**: OAuth providers may experience downtime
  - *Mitigation*: Maintain email/password authentication as backup
- **Security Vulnerabilities**: OAuth implementation may introduce security gaps
  - *Mitigation*: Regular security audits and penetration testing
- **Token Management**: JWT tokens may be compromised
  - *Mitigation*: Implement token rotation and secure storage practices

### User Experience Risks
- **Complex Flow**: Users may find OAuth confusing
  - *Mitigation*: Provide clear instructions and visual cues
- **Account Confusion**: Users may create duplicate accounts
  - *Mitigation*: Implement smart account linking and clear messaging

---

## Conclusion

This implementation will seamlessly integrate OAuth2 authentication with Google and GitHub into the existing Lurnix authentication system. The approach maintains backward compatibility while providing users with convenient social login options. The phased implementation strategy ensures thorough testing and smooth deployment across local development and production environments.