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
