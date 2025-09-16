import { generateSwaggerFile } from '../config/swagger';

// Allow skipping Swagger generation to speed up local builds
// Set SKIP_SWAGGER=1 to skip, or FORCE_SWAGGER=1 to force even in development
const shouldSkip = process.env.SKIP_SWAGGER === '1' || (
  process.env.NODE_ENV === 'development' && process.env.FORCE_SWAGGER !== '1'
);

if (shouldSkip) {
  console.log('⏭️  Skipping Swagger generation (set FORCE_SWAGGER=1 to override)');
  process.exit(0);
}

console.time('Swagger generation');
generateSwaggerFile();
console.timeEnd('Swagger generation');
