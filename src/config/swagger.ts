import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const swaggerOptions: swaggerJsDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lurnix API Documentation',
      version: '1.0.0',
      description: `
        Lurnix Backend API
        
        This is the comprehensive API documentation for the Lurnix AI-powered learning platform backend.
        
        Authentication
        
        Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        Rate Limiting
        
        API endpoints are rate-limited to prevent abuse:
        - Authentication endpoints: 5 requests per 15 minutes
        - Registration: 3 requests per hour
        - Password reset: 3 requests per hour
        - General endpoints: 100 requests per 15 minutes
        
        Error Handling
        
        All API responses follow a consistent format:
        \`\`\`json
        {
          "success": boolean,
          "data": object,      // Present on success
          "error": {           // Present on error
            "code": "string",
            "message": "string",
            "details": object  // Optional
          },
          "timestamp": "ISO 8601 string"
        }
        \`\`\`
        
        Status Codes
        
        - \`200\` - Success
        - \`201\` - Created
        - \`400\` - Bad Request / Validation Error
        - \`401\` - Unauthorized
        - \`403\` - Forbidden
        - \`404\` - Not Found
        - \`409\` - Conflict (duplicate resource)
        - \`429\` - Too Many Requests (rate limited)
        - \`500\` - Internal Server Error
      `,
      contact: {
        name: 'Lurnix API Support',
        email: 'no-reply@lurnix.tech'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5050',
        description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server'
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier'
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              description: 'Unique username'
            },
            fullname: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'User\'s full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User\'s email address'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          },
          required: ['id', 'username', 'fullname', 'email', 'isActive', 'createdAt']
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                token: {
                  type: 'string',
                  description: 'JWT authentication token'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code'
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message'
                },
                details: {
                  type: 'object',
                  description: 'Additional error details (optional)'
                }
              },
              required: ['code', 'message']
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        description: 'Field that failed validation'
                      },
                      message: {
                        type: 'string',
                        description: 'Validation error message'
                      },
                      code: {
                        type: 'string',
                        description: 'Validation error code'
                      }
                    }
                  }
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Objective: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            priority: { type: 'integer' },
            status: { type: 'string' },
            successCriteria: { type: 'array', items: { type: 'string' } },
            requiredSkills: { type: 'array', items: { type: 'string' } },
            profileSnapshotId: { type: 'string', format: 'uuid', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Sprint: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            objectiveId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            lengthDays: { type: 'integer' },
            totalEstimatedHours: { type: 'number' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            status: { type: 'string', enum: ['planned', 'in_progress', 'submitted', 'reviewed'] },
            projects: { type: 'array', items: { type: 'object' } },
            microTasks: { type: 'array', items: { type: 'object' } },
            portfolioCards: { type: 'array', items: { type: 'object' } },
            adaptationNotes: { type: 'string', nullable: true },
            progress: {
              type: 'object',
              properties: {
                completedTasks: { type: 'integer' },
                completedDays: { type: 'integer' },
                scoreEstimate: { type: 'number', nullable: true }
              }
            },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            score: { type: 'number', nullable: true },
            metadata: { type: 'object', nullable: true },
            evidence: {
              type: 'object',
              properties: {
                artifacts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      artifactId: { type: 'string' },
                      projectId: { type: 'string' },
                      type: { type: 'string', enum: ['repository', 'deployment', 'video', 'screenshot'] },
                      status: { type: 'string', enum: ['ok', 'broken', 'missing', 'unknown'] },
                      title: { type: 'string', nullable: true },
                      url: { type: 'string', nullable: true },
                      notes: { type: 'string', nullable: true },
                      updatedAt: { type: 'string', format: 'date-time' }
                    }
                  }
                },
                selfEvaluation: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    confidence: { type: 'number', nullable: true },
                    reflection: { type: 'string', nullable: true }
                  }
                }
              }
            },
            review: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['not_requested', 'pending', 'completed'] },
                reviewedAt: { type: 'string', format: 'date-time', nullable: true },
                score: { type: 'number', nullable: true },
                summary: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    score: { type: 'number' },
                    pass: { type: 'boolean' },
                    achieved: { type: 'array', items: { type: 'string' } },
                    missing: { type: 'array', items: { type: 'string' } },
                    nextRecommendations: { type: 'array', items: { type: 'string' } }
                  }
                },
                projectSummaries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      projectId: { type: 'string' },
                      projectTitle: { type: 'string', nullable: true },
                      review: {
                        type: 'object',
                        properties: {
                          score: { type: 'number' },
                          pass: { type: 'boolean' },
                          achieved: { type: 'array', items: { type: 'string' } },
                          missing: { type: 'array', items: { type: 'string' } },
                          nextRecommendations: { type: 'array', items: { type: 'string' } }
                        }
                      }
                    }
                  }
                },
                metadata: { type: 'object', nullable: true }
              }
            }
          }
        },
        PlanLimits: {
          type: 'object',
          properties: {
            planType: { type: 'string', enum: ['free', 'builder', 'master'] },
            objectiveLimit: { type: 'integer', nullable: true },
            objectiveCount: { type: 'integer' },
            remainingObjectives: { type: 'integer', nullable: true },
            canCreateObjective: { type: 'boolean' },
            gatingReason: { type: 'string', nullable: true },
            gatingMessageKey: { type: 'string', nullable: true },
            upgradePlanType: { type: 'string', nullable: true }
          }
        },
        ObjectiveSprintLimits: {
          type: 'object',
          properties: {
            planType: { type: 'string', enum: ['free', 'builder', 'master'] },
            sprintLimitPerObjective: { type: 'integer', nullable: true },
            sprintCount: { type: 'integer' },
            remainingSprints: { type: 'integer', nullable: true },
            canGenerateSprint: { type: 'boolean' },
            gatingReason: { type: 'string', nullable: true },
            gatingMessageKey: { type: 'string', nullable: true },
            upgradePlanType: { type: 'string', nullable: true }
          }
        },
        SprintPlan: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            lengthDays: { type: 'integer', enum: [1, 3, 7, 14] },
            totalEstimatedHours: { type: 'number' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            projects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  brief: { type: 'string' },
                  requirements: { type: 'array', items: { type: 'string' } },
                  acceptanceCriteria: { type: 'array', items: { type: 'string' } },
                  deliverables: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['repository', 'deployment', 'video', 'screenshot'] },
                        title: { type: 'string' },
                        artifactId: { type: 'string' }
                      }
                    }
                  },
                  evidenceRubric: {
                    type: 'object',
                    properties: {
                      dimensions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            weight: { type: 'number' },
                            levels: { type: 'array', items: { type: 'string' }, nullable: true }
                          }
                        }
                      },
                      passThreshold: { type: 'number' }
                    }
                  },
                  checkpoints: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        type: { type: 'string', enum: ['assessment', 'quiz', 'demo'] },
                        spec: { type: 'string' }
                      }
                    },
                    nullable: true
                  },
                  support: {
                    type: 'object',
                    properties: {
                      concepts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            summary: { type: 'string' }
                          }
                        },
                        nullable: true
                      },
                      practiceKatas: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            estimateMin: { type: 'number' }
                          }
                        },
                        nullable: true
                      },
                      allowedResources: { type: 'array', items: { type: 'string' }, nullable: true }
                    },
                    nullable: true
                  },
                  reflection: {
                    type: 'object',
                    properties: {
                      prompt: { type: 'string' },
                      moodCheck: { type: 'boolean' }
                    },
                    nullable: true
                  }
                }
              }
            },
            microTasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  projectId: { type: 'string' },
                  title: { type: 'string' },
                  type: { type: 'string', enum: ['concept', 'practice', 'project', 'assessment', 'reflection'] },
                  estimatedMinutes: { type: 'integer' },
                  instructions: { type: 'string' },
                  acceptanceTest: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['checklist', 'unit_tests', 'quiz', 'demo'] },
                      spec: {
                        oneOf: [
                          { type: 'string' },
                          { type: 'array', items: { type: 'string' } }
                        ]
                      }
                    }
                  },
                  resources: { type: 'array', items: { type: 'string' }, nullable: true }
                }
              }
            },
            portfolioCards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  projectId: { type: 'string' },
                  cover: { type: 'string', nullable: true },
                  headline: { type: 'string' },
                  badges: { type: 'array', items: { type: 'string' }, nullable: true },
                  links: {
                    type: 'object',
                    properties: {
                      repo: { type: 'string', nullable: true },
                      demo: { type: 'string', nullable: true },
                      video: { type: 'string', nullable: true }
                    }
                  }
                }
              },
              nullable: true
            },
            adaptationNotes: { type: 'string' },
            metadata: {
              type: 'object',
              nullable: true,
              properties: {
                plannerVersion: { type: 'string' },
                requestedAt: { type: 'string' },
                provider: { type: 'string', enum: ['remote', 'fallback'] },
                objectiveId: { type: 'string' },
                learnerProfileId: { type: 'string', nullable: true },
                preferLength: { type: 'integer', nullable: true },
                mode: { type: 'string', enum: ['skeleton', 'expansion'] },
                incremental: { type: 'boolean' },
                expansionGoal: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    targetLengthDays: { type: 'integer', nullable: true },
                    additionalMicroTasks: { type: 'integer', nullable: true }
                  }
                }
              },
              additionalProperties: true
            }
          }
        },
        SprintExpansionRequest: {
          type: 'object',
          properties: {
            targetLengthDays: { type: 'integer', enum: [1, 3, 7, 14] },
            additionalDays: { type: 'integer', minimum: 1, maximum: 14 },
            additionalMicroTasks: { type: 'integer', minimum: 1, maximum: 12 }
          }
        },
        SprintPlanResponse: {
          type: 'object',
          properties: {
            sprint: { $ref: '#/components/schemas/Sprint' },
            plan: { $ref: '#/components/schemas/SprintPlan' },
            planLimits: { $ref: '#/components/schemas/PlanLimits' },
            objectiveLimits: { $ref: '#/components/schemas/ObjectiveSprintLimits' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required'
                },
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests, please try again later'
                },
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'An internal error occurred'
                },
                timestamp: '2024-01-01T00:00:00.000Z'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'User Management',
        description: 'User profile and account management endpoints'
      },
      {
        name: 'Admin',
        description: 'Administrative endpoints (requires admin privileges)'
      },
      {
        name: 'Objectives',
        description: 'Objective and sprint planning endpoints'
      }
    ]
  },
  apis: ['./src/routes/**/*.ts'], // Scans all route files for annotations
};

export const swaggerSpec = swaggerJsDoc(swaggerOptions);

export const setupSwagger = (app: Application) => {
  // Swagger UI options
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    }
  };

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Serve Swagger JSON (OpenAPI spec)
  app.get('/swagger.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📄 Swagger UI: /api-docs | OpenAPI JSON: /swagger.json');
};

// Utility to write swagger.json file on build
export const generateSwaggerFile = () => {
  const filePath = path.join(__dirname, '../../swagger.json');
  fs.writeFileSync(filePath, JSON.stringify(swaggerSpec, null, 2));
  console.log(`✅ swagger.json generated at ${filePath}`);
};
