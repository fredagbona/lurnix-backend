# Daily Progression System - API Documentation

## Overview

The Daily Progression System provides automatic sprint generation, progress tracking, and learning analytics for continuous learning journeys.

---

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Endpoints

### Progress & Analytics

#### Get Objective Progress
```http
GET /api/objectives/:objectiveId/progress
```

**Response:**
```json
{
  "success": true,
  "data": {
    "objectiveId": "uuid",
    "totalEstimatedDays": 90,
    "currentDay": 45,
    "completedDays": 42,
    "daysRemaining": 48,
    "percentComplete": 46.7,
    "totalSprints": 45,
    "completedSprints": 42,
    "currentStreak": 7,
    "longestStreak": 14,
    "milestonesTotal": 5,
    "milestonesCompleted": 2,
    "nextMilestone": {
      "title": "Intermediate Concepts Complete",
      "targetDay": 60,
      "daysUntil": 18
    },
    "totalHoursSpent": 105,
    "averageHoursPerDay": 2.5,
    "estimatedCompletionDate": "2025-12-30T00:00:00Z",
    "projectedCompletionDate": "2026-01-05T00:00:00Z",
    "onTrack": true,
    "performanceRating": "on-track",
    "completionRate": 87.5,
    "velocity": 6.2,
    "strugglingAreas": [],
    "masteredSkills": ["Consistent execution"],
    "recommendedFocus": ["Practice intermediate concepts"]
  }
}
```

#### Get Objective Analytics
```http
GET /api/objectives/:objectiveId/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "progress": { /* same as above */ },
    "timeline": [
      {
        "date": "2025-10-01T00:00:00Z",
        "type": "objective_started",
        "title": "Objective Started",
        "description": "Started learning: Master Java"
      },
      {
        "date": "2025-10-01T18:00:00Z",
        "type": "sprint_completed",
        "title": "Day 1 Completed",
        "description": "Java Syntax Basics"
      }
    ],
    "charts": {
      "dailyProgress": [
        { "date": "2025-10-01", "completed": true },
        { "date": "2025-10-02", "completed": true }
      ]
    }
  }
}
```

#### Get Objective Timeline
```http
GET /api/objectives/:objectiveId/timeline
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "date": "2025-10-01T00:00:00Z",
        "type": "objective_started",
        "title": "Objective Started",
        "description": "Started learning: Master Java",
        "metadata": {
          "estimatedDays": 90,
          "difficulty": "intermediate"
        }
      }
    ]
  }
}
```

#### Get User Learning Stats
```http
GET /api/users/:userId/learning-stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "totalObjectives": 5,
    "activeObjectives": 2,
    "completedObjectives": 3,
    "totalDaysLearning": 150,
    "totalHoursSpent": 375,
    "averageHoursPerDay": 2.5,
    "currentStreak": 7,
    "longestStreak": 21,
    "averageCompletionRate": 85.5,
    "averageVelocity": 6.5,
    "skillsAcquired": ["JavaScript", "Python", "React"],
    "weeklyProgress": [
      {
        "week": "2025-10-01",
        "daysCompleted": 5,
        "hoursSpent": 12.5,
        "sprintsCompleted": 5
      }
    ],
    "suggestedNextObjectives": ["TypeScript", "Node.js"],
    "areasForImprovement": []
  }
}
```

#### Export Progress
```http
GET /api/objectives/:objectiveId/export?format=json
GET /api/objectives/:objectiveId/export?format=csv
```

**Query Parameters:**
- `format`: `json` or `csv` (default: `json`)

**Response:** File download (JSON or CSV)

---

### Sprint Completion

#### Complete Sprint
```http
POST /api/sprints/:sprintId/complete
```

**Request Body:**
```json
{
  "tasksCompleted": 8,
  "totalTasks": 10,
  "hoursSpent": 2.5,
  "evidenceSubmitted": true,
  "reflection": "Learned about OOP concepts..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sprintCompleted": true,
    "dayCompleted": 15,
    "nextSprintGenerated": true,
    "nextSprint": {
      "id": "uuid",
      "dayNumber": 16,
      "lengthDays": 1
    },
    "milestoneReached": {
      "id": "uuid",
      "title": "Fundamentals Complete",
      "targetDay": 15
    },
    "progress": { /* ObjectiveProgress */ },
    "notifications": [
      {
        "type": "sprint_completed",
        "title": "Sprint Completed! 🎉",
        "message": "Day 15 completed successfully!"
      },
      {
        "type": "milestone_reached",
        "title": "Milestone Reached! 🏆",
        "message": "Fundamentals Complete"
      }
    ]
  }
}
```

#### Get Completion Status
```http
GET /api/sprints/:sprintId/completion-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "canComplete": true,
    "completionPercentage": 75,
    "tasksCompleted": 7,
    "totalTasks": 10,
    "missingRequirements": []
  }
}
```

#### Update Partial Progress
```http
PUT /api/sprints/:sprintId/progress
```

**Request Body:**
```json
{
  "completionPercentage": 50,
  "hoursSpent": 1.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Progress updated successfully",
    "completionPercentage": 50
  }
}
```

---

### Sprint Generation

#### Generate Next Sprint
```http
POST /api/objectives/:objectiveId/sprints/generate-next
```

**Request Body:**
```json
{
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sprint": {
      "id": "uuid",
      "dayNumber": 16,
      "lengthDays": 1,
      "difficulty": "intermediate",
      "totalEstimatedHours": 2.5,
      "plannerOutput": { /* Sprint plan */ }
    }
  }
}
```

#### Generate Sprint Batch
```http
POST /api/objectives/:objectiveId/sprints/generate-batch
```

**Request Body:**
```json
{
  "count": 3,
  "startDay": 16
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sprints": [
      { "id": "uuid", "dayNumber": 16, "lengthDays": 1 },
      { "id": "uuid", "dayNumber": 17, "lengthDays": 1 },
      { "id": "uuid", "dayNumber": 18, "lengthDays": 1 }
    ],
    "count": 3
  }
}
```

#### Get Generation Status
```http
GET /api/objectives/:objectiveId/sprints/generation-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentDay": 15,
    "lastGeneratedDay": 18,
    "bufferDays": 3,
    "isGenerating": false,
    "nextSprintReady": true
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `OBJECTIVE_NOT_FOUND` (404) - Objective doesn't exist
- `SPRINT_NOT_FOUND` (404) - Sprint doesn't exist
- `SPRINT_ALREADY_COMPLETED` (400) - Sprint already marked complete
- `INVALID_INPUT` (400) - Invalid request parameters
- `INTERNAL_ERROR` (500) - Server error

---

## Usage Flow

### 1. Create Objective (Existing Endpoint)
```http
POST /api/objectives
```
- Automatically estimates duration
- Creates milestones
- Generates first sprint

### 2. Complete Daily Sprints
```http
POST /api/sprints/:sprintId/complete
```
- Marks sprint complete
- Auto-generates next sprint
- Updates progress
- Checks milestones

### 3. Track Progress
```http
GET /api/objectives/:objectiveId/progress
```
- View current progress
- See streaks
- Check milestones
- Get performance metrics

### 4. View Analytics
```http
GET /api/users/:userId/learning-stats
```
- Overall learning stats
- Weekly trends
- Skills acquired
- Recommendations

---

## Events

The system emits events that can be subscribed to for notifications:

- `sprint.completed` - Sprint marked complete
- `sprint.generated` - New sprint auto-generated
- `milestone.reached` - Milestone achieved
- `objective.completed` - Objective finished
- `streak.updated` - Learning streak updated
- `progress.updated` - Progress changed

---

## Rate Limits

- Sprint completion: 100 requests/hour per user
- Progress queries: 1000 requests/hour per user
- Sprint generation: 50 requests/hour per user

---

## Notes

- All dates are in ISO 8601 format (UTC)
- Sprint auto-generation happens automatically on completion
- Buffer of 3 sprints is maintained ahead of current day
- Minimum 50% task completion required to complete sprint
- Progress is tracked in real-time
