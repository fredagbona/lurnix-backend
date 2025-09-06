# 🛠️ Lurnix Backend Dev Plan — Updated Schema & Admin Separation

Below you’ll find the **final Prisma schema** with:

* `User` **without** a `role` field
* A separate \`\` model with its own roles
* All learning, quiz, roadmap, progress, and billing tables
* Clean relations (why the `User` arrays exist is explained at the end)

Then, a short **Admin Auth** section (routes, middleware, JWT claims) and **migrations** notes.

---

## 1) Prisma Schema (drop‑in)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ---------- Enums ----------

enum AdminRole {
  super_admin
  manager
  support
}

enum RoadmapType {
  seven_day   @map("7-day")
  thirty_day  @map("30-day")
}

enum ObjectiveStatus {
  todo
  doing
  done
}

enum Provider {
  paddle
  moneroo
}

enum SubStatus {
  active
  canceled
  past_due
}

enum ProductType {
  entry
  subscription
}

enum Duration {
  monthly
  yearly
  lifetime
}

// ---------- Core Models ----------

model User {
  id            String   @id @default(uuid())
  name          String
  email         String   @unique
  password_hash String
  locale        String?
  timeZone      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  subscriptions  Subscription[]
  payments       PaymentHistory[]
  roadmaps       Roadmap[]
  quizResults    QuizResult[]
  aiSessions     AiChatSession[]
}

model Admin {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  password_hash String
  role          AdminRole @default(manager)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// --------- Quiz (Versioned) ---------

model QuizQuestion {
  id            String  @id @default(uuid())
  version       Int
  key           String  @unique
  title         String
  description   String?
  type          String  // 'single' | 'multi' | 'scale'
  weightCategory String? // optional label for analytics
  sortOrder     Int
  isActive      Boolean @default(true)

  options       QuizOption[]

  @@index([version])
}

model QuizOption {
  id          String       @id @default(uuid())
  questionId  String
  label       String
  value       String
  weights     Json         // e.g., { visual:2, handsOn:1, reading:0 }

  question    QuizQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
}

model QuizResult {
  id              String   @id @default(uuid())
  userId          String
  version         Int
  answers         Json     // raw answers
  computedProfile Json     // resolved profile {style, goal, time, ...}
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([version])
}

// --------- Roadmaps & Progress ---------

model Roadmap {
  id              String       @id @default(uuid())
  userId          String
  roadmap_type    RoadmapType
  profileSnapshot Json         // snapshot of QuizResult.computedProfile used for generation
  jsonRoadmap     Json         // generated tasks/days
  createdAt       DateTime     @default(now())

  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  objectives      Objective[]
  progresses      Progress[]

  @@index([userId, roadmap_type])
}

model Objective {
  id          String          @id @default(uuid())
  roadmapId   String?
  title       String
  description String?
  dueDate     DateTime?
  status      ObjectiveStatus @default(todo)

  roadmap     Roadmap?        @relation(fields: [roadmapId], references: [id], onDelete: SetNull)
}

model Progress {
  id                  String   @id @default(uuid())
  userId              String
  roadmapId           String
  completedTasks      Json     // list of completed task IDs from Roadmap.jsonRoadmap
  completedObjectives Int      @default(0)
  streak              Int      @default(0)
  lastActivityAt      DateTime @default(now())

  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  roadmap             Roadmap  @relation(fields: [roadmapId], references: [id], onDelete: Cascade)

  @@index([userId, roadmapId])
}

// --------- Billing & Plans ---------

model SubscriptionPlan {
  id        String   @id @default(uuid())
  code      String   @unique // e.g., BASIC_MONTHLY
  name      String
  price     Decimal  @db.Numeric(10,2)
  currency  String   // USD, CFA
  duration  Duration
  features  Json     // array of flags or details
  isActive  Boolean  @default(true)

  subscriptions Subscription[]
}

model Subscription {
  id               String     @id @default(uuid())
  userId           String
  planId           String
  provider         Provider
  providerRef      String     // provider subscription ID
  status           SubStatus  @default(active)
  currentPeriodEnd DateTime?
  createdAt        DateTime   @default(now())

  user             User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan             SubscriptionPlan @relation(fields: [planId], references: [id])
}

model PaymentHistory {
  id          String      @id @default(uuid())
  userId      String
  provider    Provider
  providerRef String
  productType ProductType
  amount      Decimal     @db.Numeric(10,2)
  currency    String
  status      String      // succeeded | failed | pending
  meta        Json?
  createdAt   DateTime    @default(now())

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([provider, providerRef])
}

// --------- Optional AI chat sessions ---------

model AiChatSession {
  id        String   @id @default(uuid())
  userId    String
  messages  Json     // compact conversation history
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 2) Why the `User` relations exist

In the **User** model, these arrays represent the **relationships** a user has with other core entities:

* \`\` → Tracks all subscription records over time (active, canceled, past\_due, upgrades/downgrades). Keeps full history, not just a single current plan.
* \`\` → Logs every transaction (one‑time entries, subscription renewals, failed attempts). Vital for accounting, refunds, and support.
* \`\` → Stores every AI-generated roadmap for the user (e.g., 7‑day JavaScript, later 30‑day React track). Enables versioned learning history.
* \`\` → Saves each quiz result (v1, v2…), so we can regenerate roadmaps as goals change and audit why a plan was produced.
* \`\` (optional) → Continuity for AI coaching sessions; can be disabled for strict privacy deployments.

---

## 3) Admin Authentication & API (separate portal)

**Model:** `Admin` with `AdminRole` enum (`super_admin`, `manager`, `support`).

**Routes (backend):**

* `POST /admin/auth/login` → returns admin JWT (claim: `{ sub, email, role }`)
* `GET /admin/me` → validate/admin profile
* Admin‑only resources (JWT `role` checked by middleware):

  * `POST /admin/quiz/questions`, `PATCH /admin/quiz/questions/:id`, `POST /admin/quiz/publish`
  * `POST /admin/objectives`, `PATCH /admin/objectives/:id`
  * `POST /admin/plans`, `PATCH /admin/plans/:id`
  * `GET /admin/users`, `GET /admin/payments`, `GET /admin/subscriptions`

**Middleware:** `requireAdmin(role?: AdminRole)` → checks presence of admin token + optional min role.

**JWT Claims (admin):** `{ sub: adminId, email, role }` with short expiry + refresh flow or re‑login policy.

---

## 4) Migration Notes

* If you previously had `User.role`, remove it and **create the **********\`\`********** table**:

  ```bash
  npx prisma migrate dev --name separate-admin-and-drop-user-role
  ```
* After any schema change:

  ```bash
  npx prisma generate
  npx prisma migrate dev --name <change-name>
  ```

---

If you’d like, I can now add **seed scripts** for:

* `SubscriptionPlan` defaults (e.g., BASIC\_MONTHLY / YEARLY / LIFETIME)
* `QuizQuestion/QuizOption` v1 (French + English labels)
* A bootstrap `Admin` user (super\_admin)

And stub the **payment service** modules (`services/payments/paddle.ts`, `moneroo.ts`, `index.ts`) with typed interfaces and ## 5) Quiz & Roadmap Data — Storage, Front Handling, Examples

### 5.1 Quiz — How we store questions and answers

* **Questions/Options** live in `QuizQuestion` and `QuizOption` with a **version**. This lets us evolve wording/weights without breaking old results.
* **User submissions** are saved in `QuizResult`:

  * `answers` (Json): raw payload referencing question keys/option values
  * `computedProfile` (Json): resolved attributes we use for generation (style, goals, time budget, preferred stack, etc.)

**Example — `QuizQuestion` keys + weights**

```json
{
  "question": {
    "key": "learning_style",
    "type": "single",
    "title": "How do you prefer to learn?"
  },
  "options": [
    {"label":"Build-first", "value":"hands_on", "weights": {"handsOn": 3, "visual": 1}},
    {"label":"Videos", "value":"video", "weights": {"visual": 3}},
    {"label":"Reading docs", "value":"reading", "weights": {"reading": 3}}
  ]
}
```

**Example — `QuizResult.answers`**

```json
{
  "version": 1,
  "answers": {
    "learning_style": "hands_on",
    "time_per_day": 60,
    "goal": "frontend_job_ready",
    "target_stack": ["javascript","react"]
  }
}
```

**Example — `QuizResult.computedProfile`**

```json
{
  "style": "hands_on",
  "visual": 0.3,
  "reading": 0.2,
  "handsOn": 0.5,
  "goal": "frontend_job_ready",
  "timePerDay": 60,
  "preferredStack": ["javascript","react"],
  "level": "beginner"
}
```

**Front-end flow**

1. `/onboarding/quiz`: render the current **published version** of questions from API.
2. Submit → backend validates against that version, computes profile, stores `QuizResult`.
3. Returns a short **profile summary** for UX, then triggers roadmap generation.

---

### 5.2 Roadmaps — How we store and track

* A generated roadmap is stored in `Roadmap`:

  * `roadmap_type`: `seven_day` | `thirty_day`
  * `profileSnapshot` (Json): copy of `computedProfile` used for this generation
  * `jsonRoadmap` (Json): the structured plan
* **Progress** is tracked in `Progress`:

  * `completedTasks` (Json array of task IDs), `streak`, `lastActivityAt`
* **Objectives** (optional) let us pin bigger milestones across a roadmap.

**Example — `Roadmap.jsonRoadmap`**

```json
{
  "title": "7-Day JavaScript Kickstart",
  "days": [
    {
      "day": 1,
      "tasks": [
        {"id":"d1-t1","type":"read","title":"JS basics: variables, types","est":30},
        {"id":"d1-t2","type":"code","title":"Hello World & console","est":20,
         "acceptance": ["prints text in console","uses let/const"]}
      ]
    },
    {
      "day": 2,
      "tasks": [
        {"id":"d2-t1","type":"code","title":"Loops & functions katas","est":40},
        {"id":"d2-t2","type":"quiz","title":"Core syntax check","est":10}
      ]
    }
  ],
  "resources": [{"label":"MDN Basics","url":"https://developer.mozilla.org/"}]
}
```

**Example — `Progress.completedTasks`**

```json
["d1-t1","d1-t2","d2-t1"]
```

**Front-end flow**

1. After quiz, call `POST /roadmaps` with `roadmap_type` and latest `quizResultId`.
2. Backend generates `jsonRoadmap` (AI or rule-based), stores it, returns the full plan.
3. `/app/roadmap/*` renders by day; marking a task done updates `Progress.completedTasks`.
4. Daily cron can update `streak` based on `lastActivityAt`.

---

## 6) Localization-based Pricing — Storage & Resolution

We keep `SubscriptionPlan` generic, and add **region-specific price rows**. This supports country, currency, and tiering rules.

### 6.1 New models

```prisma
enum MarketTier { tier1 tier2 tier3 }

model Region {
  code       String    @id        // e.g., US, FR, CI, SN, BJ
  name       String
  marketTier MarketTier
  currency   String              // USD, EUR, XOF
  isActive   Boolean   @default(true)
  prices     PlanPrice[]
}

model PlanPrice {
  id        String   @id @default(uuid())
  planId    String
  regionId  String   // references Region.code via relation
  price     Decimal  @db.Numeric(10,2)
  currency  String
  isDefault Boolean  @default(false)

  plan      SubscriptionPlan @relation(fields: [planId], references: [id])
  region    Region           @relation(fields: [regionId], references: [code])

  @@unique([planId, regionId])
}
```

> Optional user fields to persist pricing decisions:
>
> * Add `billingCountry String?` and `marketTier MarketTier?` to `User`.

### 6.2 Resolution logic (backend)

1. Detect **candidate region** from (priority order):

   * Explicit user choice in pricing UI (safer for compliance)
   * Billing country from payment provider (authoritative)
   * Geo-IP/locale as a hint (never final alone)
2. Look up `Region` → fetch `PlanPrice` for displayed plans.
3. Persist chosen `billingCountry`/`marketTier` on checkout (freeze pricing).

### 6.3 Front-end handling

* `/pricing`: call `GET /pricing?country=FR` to get localized cards.
* Show currency symbol and local monthly price from `PlanPrice`.
* On checkout, send `country` and selected `planId`; backend validates and creates provider session with the correct price.

---

## 7) API Endpoints (concise)

* `GET /quiz/version` → active version + questions/options
* `POST /quiz/results` → create `QuizResult` (computes profile)
* `POST /roadmaps` → generate and save `Roadmap` from `quizResultId`
* `GET /roadmaps/:id` → fetch plan
* `PATCH /progress/:roadmapId` → toggle task IDs, update streak
* `GET /pricing` → localized plans via `Region` + `PlanPrice`

This completes how we **capture quiz data**, **generate & store roadmaps**, and **serve localized pricing** end to end.

## 5) Roadmaps, Quizzes, and Localization Handling

* **Roadmaps storage**: Each roadmap is stored in the `Roadmap` model as `jsonRoadmap` (structured JSON with days, tasks, and exercises). Example entry: `{ day: 1, tasks: [{id:"t1", title:"Hello World", description:"Write and run your first JS program"}] }`.

  * On the frontend, these JSON objects are rendered into a timeline or calendar of learning activities.
  * When a user marks a task done, the frontend updates `Progress.completedTasks`.

* **Quizzes and answers**: Quiz questions are defined in `QuizQuestion` and `QuizOption`. User answers are saved as raw JSON in `QuizResult.answers`, e.g. `{ q1: 'a', q2: ['b','c'] }`. The backend then computes a profile (`computedProfile`) that feeds into roadmap generation.

  * Frontend renders each question based on its `type` (single, multi, scale). After submit, answers are posted to API and stored.

* **Localized pricing**: `SubscriptionPlan` includes fields `currency` and `price`. To support region-based pricing: add `regionCode` (e.g. 'US', 'FR', 'SN'). Plans are seeded per region with different codes (e.g. STANDARD\_FR, STANDARD\_SN). When a user registers, we infer locale/region from their profile or IP and show the right plan.

Example `SubscriptionPlan` entries:

* `{ code: 'STANDARD_US', name: 'Standard', price: 19.00, currency: 'USD', regionCode: 'US' }`
* `{ code: 'STANDARD_SN', name: 'Standard', price: 12.00, currency: 'USD', regionCode: 'SN' }`
* `{ code: 'STANDARD_BJ', name: 'Standard', price: 7.00, currency: 'XOF', regionCode: 'BJ' }`
