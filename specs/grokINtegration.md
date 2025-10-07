Here are complete, actionable instructions to use the Groq JavaScript SDK (`groq-sdk`) in our Node.js + TypeScript backend project with Zod validation and Prisma/PostgreSQL integration, fully replacing the OpenAI client approach.

***

### Groq SDK Integration Setup

1. **Install Groq SDK**

```bash
npm install groq-sdk
```

2. **Configure Environment Variable**

Set your Groq API key in your environment:

```bash
export GROQ_API_KEY=<your-api-key>
```

3. **Initialize Groq Client in TypeScript**

Create a Groq client instance using the `groq-sdk`:

```typescript
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
```

***

### Example: Chat Completion with Groq SDK

Replace your planner API call to Groq like this:

```typescript
import { zSprintPlan } from "./schemas/roadmapSchema"; // Your Zod schema

export async function generateSprintWithGroq(plannerInput: PlannerInput) {
  // Prepare messages as arrays of objects
  const messages = [
    { role: "system", content: "You are the Lurnix planner..." },
    { role: "user", content: JSON.stringify(plannerInput) }
  ];

  // Call Groq chat completion endpoint
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b", // or your preferred Groq model ID
    messages,
  });

  // Extract chat completion result
  const sprintPlanRaw = response.choices[0]?.message?.content;

  // Validate with Zod schema
  const parsed = zSprintPlan.safeParse(JSON.parse(sprintPlanRaw));
  if (!parsed.success) {
    throw new Error("Sprint plan validation failed");
  }

  // Persist with Prisma (example)
  // await prisma.sprint.create({ data: { rawOutput: sprintPlanRaw, parsedOutput: parsed.data, ... } });

  return parsed.data;
}
```

***

### Integration Notes

- Use the `chat.completions.create` method on the `groq` instance.
- Supply your messages including system and user roles to define the prompt fully.
- Validate your JSON response strictly using Zod before using or storing.
- Store raw and parsed data with Prisma/PostgreSQL alongside metadata like model and API usage.
- Adapt the model string as Groq adds new versions or options.
- Add error handling and optional retries for schema validation failures.
- Organize API key securely using environment variables.
- This SDK is minimal and designed to work efficiently with Groq's OpenAI-compatible APIs.

