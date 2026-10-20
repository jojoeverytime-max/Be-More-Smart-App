import React from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App.jsx";
import "../styles.css";

const {
  VITE_AUTH0_DOMAIN,
  VITE_AUTH0_CLIENT_ID,
  VITE_AUTH0_AUDIENCE,
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_AUDIENCE,
} = import.meta.env;

function configuredValue(...values) {
  return values.find((value) => value?.trim() && !/^your[-_]/i.test(value.trim()));
}

const authConfig = {
  domain: configuredValue(VITE_AUTH0_DOMAIN, AUTH0_DOMAIN),
  clientId: configuredValue(VITE_AUTH0_CLIENT_ID, AUTH0_CLIENT_ID),
  audience: configuredValue(VITE_AUTH0_AUDIENCE, AUTH0_AUDIENCE),
};
const authConfigured = Object.values(authConfig).every(Boolean);

function Root() {
  if (!authConfigured) return <App authConfigured={false} />;

  return (
    <Auth0Provider
      domain={authConfig.domain}
      clientId={authConfig.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: authConfig.audience,
      }}
      cacheLocation="memory"
    >
      <App authConfigured />
    </Auth0Provider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
