import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@booklet/ui/styles.css";
import "./styles.css";
import { App } from "./app.js";

const rootElement = document.getElementById("root");
if (rootElement === null) throw new Error("Application root element was not found.");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
