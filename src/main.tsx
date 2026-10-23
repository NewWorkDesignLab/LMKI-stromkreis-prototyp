import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createApi } from "./api";
import App from "./app/App";
import { RuntimeProvider } from "./app/RuntimeContext";
import { createRuntime } from "./app/runtime";
import { StorageSettingsStore } from "./services/settings";
import "./styles/index.css";

const runtime = createRuntime({
  settings: new StorageSettingsStore(() => window.localStorage),
});

/* Fremdsteuerung (KI, Lehrkraft-Werkzeug, Konsole): window.stromkreis, siehe src/api/types.ts */
window.stromkreis = createApi(runtime);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RuntimeProvider runtime={runtime}>
      <App />
    </RuntimeProvider>
  </StrictMode>,
);
