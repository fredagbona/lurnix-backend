# Language Implementation Plan for Lurnix Backend

## Overview
Add multi-language support (English and French) to Lurnix Backend with i18next, allowing users to receive responses in their preferred language.

## Tech Stack Addition
- `i18next`: Core internationalization framework
- `i18next-fs-backend`: Filesystem backend for loading translations
- `i18next-http-middleware`: Express middleware for language detection

## Implementation Steps

### 1. Database Schema Update
- Add `language` enum to Prisma schema
- Add `language` field to User model (default: 'en')
- Generate and run migration
- Update TypeScript types

### 2. i18next Setup
- Install required packages
- Create i18n configuration
- Set up filesystem structure for translations
- Configure Express middleware

### 3. Translation Files Structure
```
src/locales/
├── en/
│   ├── auth.json     # Authentication messages
│   ├── quiz.json     # Quiz-related messages
│   ├── errors.json   # Error messages
│   └── common.json   # Common messages
└── fr/
    ├── auth.json
    ├── quiz.json
    ├── errors.json
    └── common.json
```

### 4. Core Updates
1. **User Management**
   - Update registration/profile endpoints
   - Add language preference validation
   - Modify user response DTOs

2. **Middleware**
   - Create language detection middleware
   - Integrate with auth system
   - Set request language based on user preference

3. **Error Handling**
   - Update AppError to support translations
   - Modify error middleware for i18n
   - Create error message translations

4. **Controllers**
   - Replace hardcoded messages with translation keys
   - Update response formats
   - Add language management endpoints

### 5. Testing
- Add language-specific test cases
- Update existing tests for i18n support
- Add translation validation tests

## API Changes

### New Endpoints
```http
GET /api/languages
> Returns available languages

PATCH /api/users/me/language
> Update user's language preference
```

### Modified Endpoints
All existing endpoints will now return messages in the user's preferred language.

Example Response:
```json
{
  "success": true,
  "message": "Successfully logged in", // In English or French
  "data": {
    // ... response data
  }
}
```

## Testing Strategy
1. Unit tests for language detection
2. Integration tests for language switching
3. API tests with different language preferences
4. Translation coverage verification

## Migration Strategy
1. Implement schema changes
2. Add basic i18n setup
3. Gradually migrate features to use translations
4. Add language management
5. Update documentation

## Future Considerations
- Adding more languages
- Region-specific variations
- RTL language support
- Translation management system