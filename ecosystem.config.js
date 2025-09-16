module.exports = {
  apps: [
    {
      name: "integritas-mcp-client",
      script: "npm",
      args: "start",
      cwd: "/home/integritas-mcp-client/",
      interpreter: "none",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
