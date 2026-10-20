import "dotenv/config";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getServerConfig() {
  const auth0Domain = required("AUTH0_DOMAIN").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const clientOrigins = [
    ...(process.env.CLIENT_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL.trim()] : []),
  ];
  return {
    port: Number(process.env.PORT || 3001),
    mongoUri: required("MONGODB_URI"),
    mongoDnsServers: (process.env.MONGODB_DNS_SERVERS || "")
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean),
    auth0Domain,
    auth0Audience: required("AUTH0_AUDIENCE"),
    clientOrigins: [...new Set(clientOrigins)],
  };
}
