# Lurnix Backend - Complete Project Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Development Workflow](#development-workflow)
5. [Architecture & Design](#architecture--design)
6. [API Documentation](#api-documentation)
7. [Testing](#testing)
8. [Contributing Guidelines](#contributing-guidelines)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Project Overview

**Lurnix Backend** is a comprehensive Node.js/TypeScript backend for Lurnix app with modern security practices.

### Key Features
- 🔐 **JWT-based Authentication** - Secure token-based auth with refresh tokens
- 👤 **User Management** - Registration, login, profile updates, account deletion
- 🔑 **Password Security** - Bcrypt hashing, strength validation, reset functionality
- 📧 **Email Integration** - Mailzeet service for transactional emails
- 🛡️ **Security Features** - Input validation, rate limiting (configurable), CORS
- 📊 **Health Monitoring** - Comprehensive health checks and metrics
- 🧪 **Comprehensive Testing** - Unit, integration, and e2e tests
- 📚 **API Documentation** - Auto-generated Swagger/OpenAPI docs

### Tech Stack
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jsonwebtoken)
- **Email**: Mailzeet API
- **Testing**: Jest with Supertest
- **Documentation**: Swagger/OpenAPI
- **Code Quality**: ESLint, Prettier

---

## 📁 Project Structure

```
lurnix-backend/
├── 📁 src/                          # Source code
│   ├── 📁 config/                   # Configuration files
│   │   ├── environment.ts           # Environment variables & validation
│   │   └── swagger.ts               # API documentation config
│   ├── 📁 controllers/              # Request handlers
│   │   ├── authController.ts        # Authentication endpoints
│   │   ├── userManagementController.ts # User management
│   │   ├── adminController.ts       # Admin operations
│   │   ├── emailController.ts       # Email operations
│   │   ├── healthController.ts      # Health checks
│   │   └── index.ts                 # Controller exports
│   ├── 📁 errors/                   # Error handling
│   │   ├── AppError.ts              # Custom error classes
│   │   ├── errorUtils.ts            # Error utilities
│   │   └── index.ts                 # Error exports
│   ├── 📁 middlewares/              # Express middlewares
│   │   ├── authMiddleware.ts        # JWT authentication
│   │   ├── errorMiddleware.ts       # Error handling
│   │   ├── middlewareConfig.ts      # Middleware setup
│   │   ├── securityMiddleware.ts    # Security headers
│   │   └── validation.ts            # Input validation
│   ├── 📁 prisma/                   # Database client
│   │   └── client.ts                # Prisma client instance
│   ├── 📁 repositories/             # Data access layer
│   │   ├── userRepository.ts        # User CRUD operations
│   │   └── index.ts                 # Repository exports
│   ├── 📁 routes/                   # API routes
│   │   ├── 📁 auth/                 # Authentication routes
│   │   │   └── authRoutes.ts        # Auth endpoints
│   │   ├── 📁 user/                 # User management routes
│   │   │   └── userManagementRoutes.ts # User endpoints
│   │   ├── 📁 admin/                # Admin routes
│   │   │   └── adminRoutes.ts       # Admin endpoints
│   │   ├── 📁 health/               # Health check routes
│   │   │   └── healthRoutes.ts      # Health endpoints
│   │   └── index.ts                 # Route mounting
│   ├── 📁 services/                 # Business logic layer
│   │   ├── authService.ts           # Authentication logic
│   │   ├── emailService.ts          # Email operations
│   │   ├── errorMonitoringService.ts # Error tracking
│   │   ├── healthCheckService.ts    # Health monitoring
│   │   ├── passwordResetService.ts  # Password reset logic
│   │   ├── scheduledTasksService.ts # Background tasks
│   │   └── index.ts                 # Service exports
│   ├── 📁 types/                    # TypeScript type definitions
│   │   └── auth.ts                  # Authentication types
│   ├── 📁 utils/                    # Utility functions
│   │   ├── cryptoUtils.ts           # Cryptographic utilities
│   │   ├── emailUtils.ts            # Email utilities
│   │   ├── generate-swagger.ts      # Swagger generation
│   │   ├── jwt.ts                   # JWT utilities
│   │   ├── passwordUtils.ts         # Password utilities
│   │   ├── routeUtils.ts            # Route utilities
│   │   └── userUtils.ts             # User utilities
│   ├── 📁 validation/               # Input validation schemas
│   │   ├── authSchemas.ts           # Auth validation
│   │   ├── emailSchemas.ts          # Email validation
│   │   ├── routeSchemas.ts          # Route validation
│   │   └── index.ts                 # Validation exports
│   └── server.ts                    # Application entry point
├── 📁 tests/                        # Test files
│   ├── 📁 integration/              # Integration tests
│   │   └── auth.test.ts             # API endpoint tests
│   ├── 📁 unit/                     # Unit tests
│   │   ├── 📁 controllers/          # Controller tests
│   │   ├── 📁 middlewares/          # Middleware tests
│   │   ├── 📁 repositories/         # Repository tests
│   │   ├── 📁 services/             # Service tests
│   │   └── 📁 utils/                # Utility tests
│   ├── 📁 utils/                    # Test utilities
│   │   └── testHelpers.ts           # Test helper functions
│   ├── setup.ts                     # Global test setup
│   └── runTests.ts                  # Custom test runner
├── 📁 prisma/                       # Database schema & migrations
│   ├── 📁 migrations/               # Database migrations
│   └── schema.prisma                # Database schema
├── 📁 dist/                         # Compiled JavaScript (generated)
├── 📁 generated/                    # Generated files (Prisma client)
├── 📁 coverage/                     # Test coverage reports (generated)
├── 📄 .env                          # Environment variables (local)
├── 📄 .env.example                  # Environment template
├── 📄 .env.test                     # Test environment
├── 📄 .gitignore                    # Git ignore rules
├── 📄 jest.config.js                # Jest test configuration
├── 📄 package.json                  # Project dependencies & scripts
├── 📄 swagger.json                  # Generated API documentation
├── 📄 tsconfig.json                 # TypeScript configuration
└── 📄 README.md                     # Project documentation
```

---

## 🏁 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **PostgreSQL** 12+ database
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lurnix-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure database**
   ```bash
   # Update DATABASE_URL in .env
   DATABASE_URL="postgresql://username:password@localhost:5432/lurnix_db"
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Verify installation**
   - API: http://localhost:5000/health
   - Docs: http://localhost:5000/api-docs

### Environment Configuration

**Required Environment Variables:**
```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/lurnix_db"

# JWT Security
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email Service (Mailzeet)
EMAIL_ENABLED=true
MAILZEET_API_KEY="your-mailzeet-api-key"
MAILZEET_API_URL="https://api.mailzeet.com/v1/mails"
FROM_EMAIL="noreply@yourdomain.com"
FROM_NAME="Your App Name"

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

---

## 🔄 Development Workflow

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build for production
npm start               # Start production server

# Database
npm run db:migrate      # Run database migrations
npm run db:generate     # Generate Prisma client
npm run db:studio       # Open Prisma Studio
npm run db:reset        # Reset database (dev only)

# Testing
npm test                # Run all tests
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:coverage   # Run tests with coverage
npm run test:watch      # Run tests in watch mode

# Code Quality
npm run lint            # Check code style
npm run lint:fix        # Fix code style issues
npm run format          # Format code with Prettier
npm run clean           # Clean build artifacts
```

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow the project structure
   - Write tests for new features
   - Update documentation

3. **Test Your Changes**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

---

## 🏗️ Architecture & Design

### Layered Architecture

```
┌─────────────────────────────────────────┐
│                Routes                   │ ← HTTP endpoints
├─────────────────────────────────────────┤
│              Controllers                │ ← Request/Response handling
├─────────────────────────────────────────┤
│               Services                  │ ← Business logic
├─────────────────────────────────────────┤
│             Repositories                │ ← Data access
├─────────────────────────────────────────┤
│              Database                   │ ← PostgreSQL + Prisma
└─────────────────────────────────────────┘
```

### Key Design Patterns

- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **Middleware Pattern**: Request processing pipeline
- **Error Handling**: Centralized error management
- **Dependency Injection**: Loose coupling between layers

### Security Features

- **JWT Authentication**: Stateless token-based auth
- **Password Hashing**: Bcrypt with configurable rounds
- **Input Validation**: Zod schema validation
- **Rate Limiting**: Configurable request throttling
- **CORS**: Cross-origin request handling
- **Security Headers**: XSS, CSRF protection

---

## 📚 API Documentation

### Authentication Flow

#### 1. User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### 2. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### 3. Password Reset Flow

**Step 1: Request Reset**
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Step 2: Verify Token (Optional)**
```http
GET /api/auth/verify-reset-token/your-reset-token
```

**Step 3: Reset Password**
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "your-reset-token",
  "newPassword": "NewSecurePass123!"
}
```

### Password Reset Flow Explained

1. **User requests password reset** → System generates secure token
2. **Token stored in database** → With 1-hour expiration
3. **Email sent to user** → Contains reset link with token
4. **User clicks link** → Frontend validates token (optional)
5. **User submits new password** → System verifies token and updates password
6. **Token invalidated** → One-time use security

### API Endpoints

#### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `GET /verify-reset-token/:token` - Verify reset token
- `POST /refresh-token` - Refresh JWT token

#### User Management (`/api/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /change-password` - Change password
- `DELETE /account` - Delete user account

#### Admin (`/api/admin`)
- `GET /users` - List all users
- `GET /users/:id` - Get specific user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `POST /email/test` - Test email service

#### Health & Monitoring (`/health`)
- `GET /` - Basic health check
- `GET /detailed` - Detailed health with service status
- `GET /metrics` - System metrics

### Swagger Documentation
Access interactive API docs at: `http://localhost:5000/api-docs`

---

## 🧪 Testing

### Test Structure

```
tests/
├── setup.ts                 # Global test configuration
├── utils/
│   └── testHelpers.ts       # Test utilities
├── unit/                    # Unit tests
│   ├── utils/              # Utility function tests
│   ├── services/           # Service layer tests
│   ├── repositories/       # Repository tests
│   └── middlewares/        # Middleware tests
└── integration/            # Integration tests
    └── auth.test.ts        # API endpoint tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npx jest tests/unit/services/authService.test.ts
```

### Test Configuration

- **Framework**: Jest with TypeScript support
- **Test Database**: Separate PostgreSQL database
- **Mocking**: Email service and external APIs mocked
- **Coverage Target**: >90% statements, >85% branches

### Writing Tests

**Unit Test Example:**
```typescript
describe('AuthService', () => {
  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        fullname: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      const result = await authService.register(userData);

      expect(result.success).toBe(true);
      expect(result.user.email).toBe(userData.email);
    });
  });
});
```

**Integration Test Example:**
```typescript
describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const userData = {
      username: 'newuser',
      fullname: 'New User',
      email: 'newuser@example.com',
      password: 'Password123!'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
});
```

---

## 🤝 Contributing Guidelines

### Code Standards

1. **TypeScript**: Use strict TypeScript with proper typing
2. **ESLint**: Follow configured linting rules
3. **Prettier**: Use consistent code formatting
4. **Naming Conventions**:
   - Files: `camelCase.ts`
   - Classes: `PascalCase`
   - Functions/Variables: `camelCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Interfaces: `PascalCase` (no `I` prefix)

### Adding New Features

#### 1. Plan Your Feature
- Define requirements and scope
- Design API endpoints if needed
- Plan database schema changes
- Consider security implications

#### 2. Create Feature Structure

**For a new API endpoint:**
```
1. Add types in src/types/
2. Create validation schema in src/validation/
3. Add service logic in src/services/
4. Create controller in src/controllers/
5. Add routes in src/routes/
6. Write tests in tests/
7. Update Swagger documentation
```

**Example: Adding a "Posts" feature**
```
src/
├── types/
│   └── posts.ts              # Post types
├── validation/
│   └── postSchemas.ts        # Post validation
├── services/
│   └── postService.ts        # Post business logic
├── controllers/
│   └── postController.ts     # Post endpoints
├── routes/
│   └── posts/
│       └── postRoutes.ts     # Post routes
└── repositories/
    └── postRepository.ts     # Post data access
```

#### 3. Database Changes

**Adding new tables:**
```bash
# 1. Update prisma/schema.prisma
# 2. Create migration
npm run db:migrate
# 3. Generate client
npm run db:generate
```

#### 4. Testing Requirements

- **Unit tests** for all service functions
- **Integration tests** for API endpoints
- **Error case testing** for edge cases
- **Validation testing** for input schemas

### Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
git commit -m "feat: add user profile picture upload"

# Bug fix
git commit -m "fix: resolve JWT token expiration issue"

# Documentation
git commit -m "docs: update API documentation"

# Refactor
git commit -m "refactor: improve error handling in auth service"

# Test
git commit -m "test: add integration tests for password reset"

# Chore
git commit -m "chore: update dependencies"
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Development Checklist**
   - [ ] Code follows style guidelines
   - [ ] Tests written and passing
   - [ ] Documentation updated
   - [ ] No console.log statements
   - [ ] Error handling implemented
   - [ ] Security considerations addressed

3. **Pre-PR Checklist**
   ```bash
   npm run lint          # Check code style
   npm test              # Run all tests
   npm run build         # Verify build
   ```

4. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes
   ```

5. **Review Process**
   - Code review by team member
   - All tests must pass
   - Documentation review
   - Security review for auth changes

### File Organization Rules

#### Controllers (`src/controllers/`)
- One controller per resource/domain
- Use class-based controllers
- Handle HTTP concerns only
- Delegate business logic to services

```typescript
export class UserController {
  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await userService.getProfile(req.user.userId);
    res.json({ success: true, data: user });
  });
}
```

#### Services (`src/services/`)
- Business logic layer
- No HTTP concerns
- Use dependency injection
- Handle errors appropriately

```typescript
export class UserService {
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return toUserProfile(user);
  }
}
```

#### Repositories (`src/repositories/`)
- Data access layer only
- Database operations
- No business logic
- Return domain objects

```typescript
export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({ where: { id } });
  }
}
```

#### Routes (`src/routes/`)
- Group by domain/resource
- Apply middleware
- Mount controllers
- Include Swagger docs

```typescript
router.post('/profile',
  authenticate,
  validateRequest(updateProfileSchema),
  userController.updateProfile
);
```

### Error Handling Standards

1. **Use Custom Error Classes**
   ```typescript
   throw new UserNotFoundError(userId);
   ```

2. **Handle Errors in Services**
   ```typescript
   try {
     return await someOperation();
   } catch (error) {
     throw new ServiceError('Operation failed', error);
   }
   ```

3. **Use asyncHandler for Controllers**
   ```typescript
   export const getUser = asyncHandler(async (req, res) => {
     // Controller logic
   });
   ```

### Security Guidelines

1. **Input Validation**: Always validate input with Zod schemas
2. **Authentication**: Protect routes with `authenticate` middleware
3. **Authorization**: Check user permissions before operations
4. **Sanitization**: Sanitize user input to prevent XSS
5. **Rate Limiting**: Apply appropriate rate limits
6. **Error Messages**: Don't expose sensitive information

---

## 🚀 Deployment

### Environment Setup

1. **Production Environment Variables**
   ```env
   NODE_ENV=production
   DATABASE_URL="postgresql://user:pass@host:5432/db"
   JWT_SECRET="your-production-jwt-secret-min-32-chars"
   MAILZEET_API_KEY="your-production-mailzeet-key"
   ```

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

### Health Checks

- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /health/detailed`
- **Metrics**: `GET /health/metrics`

---

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connection
npx prisma db pull

# Reset database (development only)
npm run db:reset

# Check migrations
npx prisma migrate status
```

#### JWT Token Issues
```bash
# Verify JWT_SECRET is set and long enough (32+ chars)
echo $JWT_SECRET

# Check token expiration settings
# JWT_EXPIRES_IN and JWT_REFRESH_EXPIRES_IN
```

#### Email Service Issues
```bash
# Test email configuration
curl -X POST http://localhost:5000/api/admin/email/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

#### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 PID

# Or use different port
PORT=3001 npm run dev
```

### Debug Commands

```bash
# Check environment variables
npm run env:check

# Verbose logging
DEBUG=* npm run dev

# Check database schema
npx prisma studio

# Validate configuration
node -e "console.log(require('./dist/config/environment.js'))"
```

### Logging

- **Development**: Console logging enabled
- **Production**: Structured logging recommended
- **Error Monitoring**: Integrated error tracking

---

## 📞 Support

For questions, issues, or contributions:

1. **Check Documentation**: Review this README and API docs
2. **Search Issues**: Look for existing GitHub issues
3. **Create Issue**: Submit detailed bug reports or feature requests
4. **Join Discussions**: Participate in project discussions

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Coding! 🚀**