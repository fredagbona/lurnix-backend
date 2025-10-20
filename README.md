# Lurnix Backend

> A comprehensive learning management platform backend built with Node.js, TypeScript, and Express, featuring domain-driven architecture and AI-powered personalized learning paths.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Available Commands](#available-commands)
- [Project Structure](#project-structure)
- [Domain Documentation](#domain-documentation)
- [API Documentation](#api-documentation)
- [Development Guidelines](#development-guidelines)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🎯 Overview

Lurnix Backend is a robust, scalable learning management system that provides personalized learning experiences through adaptive quizzes, AI-powered roadmap generation, and comprehensive progress tracking. The platform supports multiple languages, subscription-based access, and features a complete admin dashboard.

### Key Capabilities

- **Adaptive Learning**: AI-driven personalized learning paths based on user profiles and quiz results
- **Sprint-Based Learning**: Break down objectives into manageable daily/weekly sprints
- **Progress Tracking**: Comprehensive analytics and progress monitoring
- **Multi-Language Support**: i18n support for English and French
- **Subscription Management**: Paddle integration for payment processing
- **Admin Dashboard**: Complete administrative control and analytics

---

## ✨ Features

### For Learners
- 🎯 **Personalized Learning Paths**: AI-generated roadmaps tailored to individual skills and goals
- 📊 **Adaptive Quizzes**: Dynamic assessments that adjust to learner performance
- 🏃 **Sprint System**: Structured learning in manageable time-boxed sprints
- 📈 **Progress Analytics**: Real-time tracking of learning progress and achievements
- 🎓 **Technical Assessments**: Comprehensive skill evaluation system
- 🌍 **Multi-Language**: Full support for English and French

### For Administrators
- 👥 **User Management**: Complete control over user accounts and permissions
- 📊 **Analytics Dashboard**: Insights into platform usage and learner progress
- 🎫 **Coupon Management**: Create and manage promotional codes
- 💰 **Subscription Oversight**: Monitor and manage user subscriptions
- 🔧 **Feature Flags**: Control feature rollout and A/B testing
- 📧 **Communication Tools**: Email notifications and user engagement

### For Developers
- 🏗️ **Domain-Driven Design**: Clean, maintainable architecture
- 🔒 **Type-Safe**: Full TypeScript implementation
- 🧪 **Testable**: Modular design for easy testing
- 📝 **Well-Documented**: Comprehensive API documentation
- 🔄 **Event-Driven**: Decoupled components with event system

---

## 🛠️ Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **TypeScript** | 5.x | Type-safe development |
| **Express** | 4.x | Web framework |
| **Prisma** | 5.x | ORM and database toolkit |
| **PostgreSQL** | 14+ | Primary database |

### Key Libraries

**Authentication & Security**
- `jsonwebtoken` - JWT token generation and verification
- `bcrypt` - Password hashing
- `passport` - OAuth authentication (Google, GitHub)
- `express-rate-limit` - API rate limiting
- `helmet` - Security headers

**Validation & Parsing**
- `zod` - Schema validation
- `express-validator` - Request validation

**Internationalization**
- `i18next` - Translation framework
- `i18next-fs-backend` - File system backend for translations

**Payment Processing**
- `@paddle/paddle-node-sdk` - Paddle payment integration

**Email**
- `nodemailer` - Email sending
- `handlebars` - Email template engine

**Development Tools**
- `ts-node` - TypeScript execution
- `nodemon` - Auto-restart on changes
- `copyfiles` - Asset copying for build

**Utilities**
- `date-fns` - Date manipulation
- `uuid` - Unique ID generation
- `dotenv` - Environment variable management

---

## 🏗️ Architecture

### Domain-Driven Design

The application follows a **domain-driven architecture** where business logic is organized into self-contained domains. Each domain encapsulates its own controllers, services, repositories, routes, and validation logic.

```
Domain Structure:
├── controllers/    # HTTP request handlers
├── services/       # Business logic
├── repositories/   # Data access layer
├── routes/         # API endpoints
├── validation/     # Request validation schemas
├── types/          # Domain-specific types
└── index.ts        # Domain exports
```

### Architectural Principles

1. **Separation of Concerns**: Each domain handles its own business logic
2. **Single Responsibility**: Components have one clear purpose
3. **Dependency Injection**: Loose coupling between components
4. **Event-Driven**: Domains communicate through events when needed
5. **Type Safety**: Full TypeScript coverage for compile-time safety

### Request Flow

```
Client Request
    ↓
Express Router (src/routes/index.ts)
    ↓
Domain Routes (domains/*/routes/)
    ↓
Middleware (auth, validation, rate limiting)
    ↓
Controllers (domains/*/controllers/)
    ↓
Services (domains/*/services/)
    ↓
Repositories (domains/*/repositories/)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **PostgreSQL** 14.x or higher
- **Git**

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

4. **Set up the database**
   ```bash
   # Run migrations
   npx prisma migrate dev
   
   # Seed the database
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000` (or your configured PORT).

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory with the following variables:

### Required Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=/api

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lurnix?schema=public"

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Email Configuration (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@lurnix.com

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Paddle Payment Integration
PADDLE_API_KEY=your-paddle-api-key
PADDLE_WEBHOOK_SECRET=your-paddle-webhook-secret
PADDLE_ENVIRONMENT=sandbox # or 'production'

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# AI Services (Optional)
OPENAI_API_KEY=your-openai-api-key
```

### Environment-Specific Configurations

**Development** (`.env.development`)
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

**Production** (`.env.production`)
```bash
NODE_ENV=production
LOG_LEVEL=error
```

---

## 🗄️ Database Setup

### Prisma Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

### Database Seeding

```bash
# Seed all data
npm run seed

# Seed specific data
npm run seed:admin      # Create admin users
npm run seed:quiz       # Seed quiz data
npm run seed:adaptive   # Seed adaptive quiz data
npm run seed:coupons    # Seed coupon codes
```

### Prisma Studio

Launch Prisma Studio to view and edit data:
```bash
npx prisma studio
```

---

## 📜 Available Commands

### Development

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Type check without building
npm run type-check
```

### Database

```bash
# Run migrations
npm run migrate

# Seed database
npm run seed

# Open Prisma Studio
npm run studio

# Generate Prisma Client
npm run generate
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.spec.ts
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Type check
npm run type-check
```

### Utilities

```bash
# Get test user ID
npm run get-test-user

# Map Paddle IDs
npm run map-paddle-ids
```

---

## 📁 Project Structure

```
lurnix-backend/
├── prisma/                      # Database schema and migrations
│   ├── migrations/              # Migration files
│   ├── seeds/                   # Seed scripts
│   │   ├── data/               # Seed data files
│   │   ├── adaptiveQuizSeed.ts
│   │   ├── couponSeed.ts
│   │   └── seed.ts
│   └── schema.prisma           # Prisma schema definition
│
├── src/                        # Source code
│   ├── domains/                # Domain-driven modules
│   │   ├── admin/             # Admin management
│   │   ├── ai/                # AI-powered features
│   │   ├── analytics/         # Learning analytics
│   │   ├── assessment/        # Quizzes and assessments
│   │   ├── auth/              # Authentication & authorization
│   │   ├── billing/           # Subscriptions and payments
│   │   ├── communication/     # Email and notifications
│   │   ├── features/          # Feature requests and flags
│   │   ├── infrastructure/    # Health checks, events
│   │   ├── learning/          # Objectives, sprints, progress
│   │   └── profile/           # Learner profiles
│   │
│   ├── config/                # Application configuration
│   │   ├── i18n/             # Internationalization config
│   │   ├── database.ts       # Database configuration
│   │   ├── environment.ts    # Environment variables
│   │   └── ...
│   │
│   ├── middlewares/           # Express middlewares
│   │   ├── authMiddleware.ts
│   │   ├── errorMiddleware.ts
│   │   ├── rateLimitMiddleware.ts
│   │   └── ...
│   │
│   ├── routes/                # Main route mounting
│   │   └── index.ts
│   │
│   ├── errors/                # Error handling
│   │   ├── AppError.ts
│   │   └── errorUtils.ts
│   │
│   ├── events/                # Event system
│   │   └── profileEvents.ts
│   │
│   ├── utils/                 # Utility functions
│   │   ├── jwt.ts
│   │   ├── passwordUtils.ts
│   │   └── ...
│   │
│   ├── types/                 # Shared TypeScript types
│   │   ├── auth.ts
│   │   ├── express.d.ts
│   │   └── ...
│   │
│   ├── validation/            # Shared validation
│   │   ├── routeSchemas.ts
│   │   └── index.ts
│   │
│   ├── serializers/           # Data serialization
│   │   └── objectiveSerializer.ts
│   │
│   ├── schemas/               # Shared schemas
│   │   └── planSchemas.ts
│   │
│   ├── locales/               # i18n translations
│   │   ├── en/
│   │   └── fr/
│   │
│   ├── prisma/                # Prisma client wrapper
│   │   └── prismaWrapper.ts
│   │
│   └── server.ts              # Application entry point
│
├── scripts/                    # Utility scripts
│   ├── getTestUserId.ts
│   ├── mapPaddleIds.ts
│   └── seedAdmin.ts
│
├── docs/                       # Documentation
│   ├── ADAPTIVE-QUIZ-IMPLEMENTATION.md
│   ├── COMPLETE-LEARNING-FLOW.md
│   └── ...
│
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── ecosystem.config.js        # PM2 configuration
└── README.md                  # This file
```

---

## 🏛️ Domain Documentation

### 1. **Admin Domain** (`domains/admin/`)
Manages administrative functions, user management, and system configuration.

**Key Features:**
- Admin authentication and authorization
- User management (CRUD operations)
- Role-based access control (RBAC)
- Admin password reset
- Region management
- System seeding

**Main Services:**
- `adminAuthService` - Admin authentication
- `adminSeedService` - Database seeding
- `regionService` - Geographic region management

---

### 2. **AI Domain** (`domains/ai/`)
AI-powered features for profile generation and personalized recommendations.

**Key Features:**
- AI-based learner profile generation
- Profile retrieval and management
- Integration with quiz results

**Main Services:**
- `aiService` - AI profile generation (currently disabled)

**Note:** AI profile generation is temporarily disabled while the new planner stack is being rolled out.

---

### 3. **Analytics Domain** (`domains/analytics/`)
Tracks and analyzes learning progress, skill development, and platform usage.

**Key Features:**
- Learning analytics and insights
- Skill tracking and progression
- User engagement metrics
- Progress visualization data

**Main Services:**
- `learningAnalyticsService` - Learning progress analytics
- `skillTrackingService` - Skill development tracking

---

### 4. **Assessment Domain** (`domains/assessment/`)
Comprehensive quiz and assessment system with adaptive learning capabilities.

**Key Features:**
- Personality-based quizzes
- Adaptive quiz engine
- Technical skill assessments
- Knowledge validation
- Quiz administration
- Multi-language quiz support

**Main Services:**
- `quizService` - Quiz management and scoring
- `adaptiveLearningService` - Adaptive quiz logic
- `technicalAssessmentService` - Technical skill evaluation
- `knowledgeValidationService` - Knowledge verification
- `quizGenerationService` - Dynamic quiz generation

---

### 5. **Auth Domain** (`domains/auth/`)
Handles user authentication, authorization, and account management.

**Key Features:**
- JWT-based authentication
- OAuth integration (Google, GitHub)
- Email verification
- Password reset flow
- User registration and login
- Session management

**Main Services:**
- `authService` - User authentication
- `passwordResetService` - Password recovery
- `oauthService` - OAuth provider integration

**Repositories:**
- `userRepository` - User data access

---

### 6. **Billing Domain** (`domains/billing/`)
Manages subscriptions, payments, and plan limitations using Paddle.

**Key Features:**
- Subscription management
- Payment processing via Paddle
- Plan and pricing management
- Coupon system
- Webhook handling
- Plan limitation enforcement

**Main Services:**
- `subscriptionService` - Subscription lifecycle
- `planService` - Plan management
- `couponService` - Coupon creation and validation
- `webhookService` - Paddle webhook processing
- `planLimitationService` - Feature access control

---

### 7. **Communication Domain** (`domains/communication/`)
Email notifications and user communication.

**Key Features:**
- Transactional emails
- Email templates (Handlebars)
- Multi-language email support
- Welcome emails
- Password reset emails
- Admin notifications

**Main Services:**
- `emailService` - Email sending and templating

**Templates:**
- Welcome emails
- Password reset
- Admin notifications
- Subscription updates

---

### 8. **Features Domain** (`domains/features/`)
Feature request system and feature flag management.

**Key Features:**
- Feature request submission
- Voting system
- Feature status tracking
- Admin moderation
- Feature gates/flags

**Main Services:**
- `featureRequestService` - Feature request management
- `featureGateService` - Feature flag control

---

### 9. **Infrastructure Domain** (`domains/infrastructure/`)
Core infrastructure services, health checks, and event system.

**Key Features:**
- Health check endpoints
- Event emitter system
- System monitoring
- Service status

**Main Services:**
- `healthService` - Health check logic
- Event emitter - Domain event system

---

### 10. **Learning Domain** (`domains/learning/`)
Core learning functionality including objectives, sprints, and progress tracking.

**Key Features:**
- Learning objective management
- Sprint-based learning system
- Progress tracking
- Evidence submission
- Sprint review and feedback
- Adaptive sprint generation
- Profile context building
- Planner integration

**Main Services:**
- `objectiveService` - Objective CRUD and management
- `objectiveProgressService` - Progress calculation
- `objectiveEstimationService` - Time estimation
- `sprintService` - Sprint management
- `sprintAutoGenerationService` - Automatic sprint creation
- `sprintCompletionHandler` - Sprint completion logic
- `plannerService` - AI planner integration
- `reviewerService` - Sprint review and feedback
- `evidenceService` - Evidence submission
- `profileContextBuilder` - Learner context building

**Repositories:**
- `sprintRepository` - Sprint data access
- `sprintArtifactRepository` - Sprint artifact management

---

### 11. **Profile Domain** (`domains/profile/`)
Learner profile management and personalization.

**Key Features:**
- Learner profile CRUD
- Profile snapshots
- Skill and gap tracking
- Learning preferences
- Profile versioning

**Main Services:**
- `learnerProfileService` - Profile management

**Repositories:**
- `learnerProfileRepository` - Profile data access

---

## 📚 API Documentation

### Base URL
```
Development: http://localhost:3000/api
Production: https://api.lurnix.com/api
```

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### API Endpoints Overview

#### **Authentication** (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /verify-email` - Verify email address
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `GET /oauth/google` - Google OAuth
- `GET /oauth/github` - GitHub OAuth

#### **Users** (`/api/users`)
- `GET /me` - Get current user profile
- `PUT /me` - Update current user
- `DELETE /me` - Delete account

#### **Quizzes** (`/api/quiz`, `/api/quizzes`)
- `GET /quiz` - Get quiz questions
- `POST /quiz/submit` - Submit quiz answers
- `GET /quizzes/adaptive` - Get adaptive quiz
- `POST /quizzes/adaptive/submit` - Submit adaptive quiz

#### **Objectives** (`/api/objectives`)
- `GET /objectives` - List user objectives
- `POST /objectives` - Create new objective
- `GET /objectives/:id` - Get objective details
- `PUT /objectives/:id` - Update objective
- `DELETE /objectives/:id` - Delete objective
- `POST /objectives/:id/sprints` - Generate sprint
- `GET /objectives/:id/progress` - Get progress

#### **Sprints** (`/api/sprints`)
- `GET /sprints/:id` - Get sprint details
- `POST /sprints/:id/start` - Start sprint
- `POST /sprints/:id/complete` - Complete sprint
- `POST /sprints/:id/evidence` - Submit evidence
- `POST /sprints/:id/review` - Request review

#### **Subscriptions** (`/api/subscriptions`)
- `GET /subscriptions` - Get user subscription
- `POST /subscriptions` - Create subscription
- `PUT /subscriptions/:id` - Update subscription
- `DELETE /subscriptions/:id` - Cancel subscription

#### **Admin** (`/api/admin`)
- `POST /admin/login` - Admin login
- `GET /admin/users` - List all users
- `GET /admin/analytics` - Platform analytics
- `POST /admin/coupons` - Create coupon
- `GET /admin/quiz` - Manage quizzes

#### **Feature Requests** (`/api/features`)
- `GET /features` - List feature requests
- `POST /features` - Submit feature request
- `POST /features/:id/vote` - Vote for feature
- `PUT /features/:id/status` - Update status (admin)

#### **Health** (`/health`)
- `GET /health` - Health check endpoint

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## 💻 Development Guidelines

### Code Style

- **TypeScript**: Use strict mode, avoid `any` types
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **File Names**: camelCase for files, match export name
- **Imports**: Use absolute imports from domain roots when possible
- **Comments**: JSDoc for public APIs, inline for complex logic

### Domain Guidelines

1. **Keep domains independent**: Minimize cross-domain dependencies
2. **Use events for communication**: Prefer event-driven over direct calls
3. **Repository pattern**: All database access through repositories
4. **Service layer**: Business logic in services, not controllers
5. **Validation**: Use Zod schemas for request validation

### Error Handling

Use `AppError` class for application errors:

```typescript
import { AppError } from '@/errors/AppError';

throw new AppError('User not found', 404, 'USER_NOT_FOUND');
```

### Adding a New Domain

1. Create domain folder: `src/domains/new-domain/`
2. Add subdirectories: `controllers/`, `services/`, `routes/`, etc.
3. Create `index.ts` barrel export
4. Register routes in `src/routes/index.ts`
5. Update this README

---

## 🧪 Testing

### Test Structure

```
src/domains/[domain]/__tests__/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── e2e/           # End-to-end tests
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('UserService', () => {
  beforeEach(() => {
    // Setup
  });

  it('should create a new user', async () => {
    // Test implementation
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Specific domain
npm test -- domains/auth

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## 🚢 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs

# Restart
pm2 restart lurnix-backend
```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment Variables

Ensure all required environment variables are set in production:
- Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- Never commit `.env` files
- Use different JWT secrets per environment
- Enable HTTPS in production
- Configure proper CORS origins

---

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation update
style: code style changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

### Pull Request Guidelines

- Keep PRs focused and small
- Update documentation
- Add tests for new features
- Ensure all tests pass
- Follow code style guidelines

---

## 📄 License

This project is proprietary and confidential.

---

## 👥 Team

- **Development Team**: Lurnix Engineering
- **Maintainer**: [Your Name]
- **Contact**: support@lurnix.com

---

## 🔗 Links

- **Documentation**: [docs.lurnix.com](https://docs.lurnix.com)
- **API Reference**: [api.lurnix.com/docs](https://api.lurnix.com/docs)
- **Issue Tracker**: [GitHub Issues](https://github.com/lurnix/backend/issues)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

## 📝 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

---

**Built with ❤️ by the Lurnix Team**
