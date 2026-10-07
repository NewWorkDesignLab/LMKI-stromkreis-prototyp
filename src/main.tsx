import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createApi } from "./api";
import App from "./app/App";
import { RuntimeProvider } from "./app/RuntimeContext";
import { createRuntime } from "./app/runtime";
import "./styles/index.css";

const runtime = createRuntime();

/* Fremdsteuerung (KI, Lehrkraft-Werkzeug, Konsole): window.stromkreis, siehe src/api/types.ts */
window.stromkreis = createApi(runtime);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RuntimeProvider runtime={runtime}>
      <App />
    </RuntimeProvider>
  </StrictMode>,
);
