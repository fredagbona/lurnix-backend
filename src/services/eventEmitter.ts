import { EventEmitter } from 'events';

// ============================================
// EVENT TYPES
// ============================================

export enum SprintEvent {
  SPRINT_COMPLETED = 'sprint.completed',
  SPRINT_GENERATED = 'sprint.generated',
  SPRINT_STARTED = 'sprint.started',
  MILESTONE_REACHED = 'milestone.reached',
  OBJECTIVE_COMPLETED = 'objective.completed',
  OBJECTIVE_CREATED = 'objective.created',
  DAY_COMPLETED = 'day.completed',
  STREAK_UPDATED = 'streak.updated',
  PROGRESS_UPDATED = 'progress.updated'
}

export interface SprintEventPayload {
  event: SprintEvent;
  objectiveId: string;
  sprintId?: string;
  userId: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// ============================================
// EVENT EMITTER CLASS
// ============================================

class SprintEventEmitter extends EventEmitter {
  /**
   * Emit a sprint event
   */
  async emitSprintEvent(event: SprintEvent, payload: Omit<SprintEventPayload, 'event' | 'timestamp'>): Promise<void> {
    const fullPayload: SprintEventPayload = {
      event,
      ...payload,
      timestamp: new Date()
    };

    console.log('[eventEmitter] Emitting event', {
      event,
      objectiveId: payload.objectiveId,
      userId: payload.userId
    });

    this.emit(event, fullPayload);
    this.emit('*', fullPayload); // Wildcard listener
  }

  /**
   * Subscribe to a specific event
   */
  onSprintEvent(event: SprintEvent, handler: (payload: SprintEventPayload) => Promise<void> | void): void {
    this.on(event, handler);
  }

  /**
   * Subscribe to all events
   */
  onAnyEvent(handler: (payload: SprintEventPayload) => Promise<void> | void): void {
    this.on('*', handler);
  }

  /**
   * Unsubscribe from event
   */
  offSprintEvent(event: SprintEvent, handler: Function): void {
    this.off(event, handler);
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const sprintEventEmitter = new SprintEventEmitter();

// ============================================
// EXAMPLE EVENT HANDLERS
// ============================================

// Log all events (can be disabled in production)
if (process.env.NODE_ENV !== 'production') {
  sprintEventEmitter.onAnyEvent((payload) => {
    console.log('[eventEmitter] Event received:', {
      event: payload.event,
      objectiveId: payload.objectiveId,
      userId: payload.userId,
      timestamp: payload.timestamp
    });
  });
}

// Example: Send notification on sprint completion
sprintEventEmitter.onSprintEvent(SprintEvent.SPRINT_COMPLETED, async (payload) => {
  // TODO: Integrate with notification service
  console.log('[eventEmitter] Sprint completed notification', {
    userId: payload.userId,
    sprintId: payload.sprintId
  });
});

// Example: Send notification on milestone reached
sprintEventEmitter.onSprintEvent(SprintEvent.MILESTONE_REACHED, async (payload) => {
  // TODO: Integrate with notification service
  console.log('[eventEmitter] Milestone reached notification', {
    userId: payload.userId,
    milestone: payload.data.milestoneTitle
  });
});

// Example: Webhook for objective completion
sprintEventEmitter.onSprintEvent(SprintEvent.OBJECTIVE_COMPLETED, async (payload) => {
  // TODO: Send webhook to external services
  console.log('[eventEmitter] Objective completed webhook', {
    userId: payload.userId,
    objectiveId: payload.objectiveId
  });
});

export default sprintEventEmitter;
