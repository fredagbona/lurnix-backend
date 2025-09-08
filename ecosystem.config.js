module.exports = {
  apps: [
    {
      name: 'lurnix-backend',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5050
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5050
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      error_file: '/var/www/lurnix/lurnix-backend/shared/logs/error.log',
      out_file: '/var/www/lurnix/lurnix-backend/shared/logs/out.log',
      time: true
    }
  ]
};
