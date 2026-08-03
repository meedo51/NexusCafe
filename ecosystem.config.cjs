module.exports = {
  apps: [
    {
      name: "nexuscafe-pos",
      script: "./dist/server.cjs",
      instances: 16,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
