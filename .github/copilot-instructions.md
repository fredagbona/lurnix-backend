# Copilot Instructions for Lurnix Backend

## Overview
This document provides essential guidelines for AI coding agents to be productive in the Lurnix Backend project. The backend is a Node.js/TypeScript application with a layered architecture, leveraging Prisma ORM for database interactions and Express.js for routing.

---

## Architecture

### Layered Design
The project follows a layered architecture:

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

### Key Patterns
- **Repository Pattern**: Abstracts database operations.
- **Service Layer**: Encapsulates business logic.
- **Middleware**: Handles cross-cutting concerns like authentication and validation.
- **Error Handling**: Centralized error management using custom error classes.

---

## Developer Workflows

### Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd lurnix-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Update .env with your configuration
   ```
4. Run database migrations:
   ```bash
   npm run db:migrate
   npm run db:generate
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

### Testing
- Run all tests:
  ```bash
  npm test
  ```
- Run unit tests:
  ```bash
  npm run test:unit
  ```
- Run integration tests:
  ```bash
  npm run test:integration
  ```

---

## Project Conventions

### File Organization
- **Controllers**: Handle HTTP requests (`src/controllers/`).
- **Services**: Contain business logic (`src/services/`).
- **Repositories**: Abstract database operations (`src/repositories/`).
- **Routes**: Define API endpoints (`src/routes/`).
- **Middlewares**: Handle cross-cutting concerns (`src/middlewares/`).

### Naming Conventions
- Files: `camelCase.ts`
- Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (no `I` prefix)

### Error Handling
- Use custom error classes (e.g., `AppError`).
- Handle errors in services and propagate them to controllers.
- Use `asyncHandler` for controllers to manage async errors.

---

## Integration Points

### Database
- **Prisma ORM**: Database schema is defined in `prisma/schema.prisma`.
- Run migrations with:
  ```bash
  npm run db:migrate
  ```

### Authentication
- **JWT-based**: Implemented in `authMiddleware.ts` and `authService.ts`.
- Tokens are signed using `JWT_SECRET` from environment variables.

### Email
- **Mailzeet API**: Configured in `emailService.ts`.
- Requires `MAILZEET_API_KEY` and `MAILZEET_API_URL` in `.env`.

---

## Examples

### Adding a New Feature
1. Define types in `src/types/`.
2. Create validation schemas in `src/validation/`.
3. Add business logic in `src/services/`.
4. Implement controllers in `src/controllers/`.
5. Define routes in `src/routes/`.
6. Write tests in `tests/`.

### Example: Adding a "Posts" Feature
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

---

## Security Guidelines
1. Validate all inputs using Zod schemas.
2. Protect routes with `authMiddleware.ts`.
3. Use `bcrypt` for password hashing.
4. Sanitize user inputs to prevent XSS.
5. Apply rate limiting to sensitive endpoints.

---

## Additional Notes
- Swagger documentation is auto-generated and available at `/api-docs`.
- Use `npm run lint` and `npm run format` to ensure code quality.
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

For more details, refer to the [README.md](../README.md).