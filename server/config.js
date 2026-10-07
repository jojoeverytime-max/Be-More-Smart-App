import "dotenv/config";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getServerConfig() {
  const auth0Domain = required("AUTH0_DOMAIN").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return {
    port: Number(process.env.PORT || 3001),
    mongoUri: required("MONGODB_URI"),
    auth0Domain,
    auth0Audience: required("AUTH0_AUDIENCE"),
    clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
