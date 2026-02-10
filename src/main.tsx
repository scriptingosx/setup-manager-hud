import "@fontsource-variable/figtree";
import { createRoot } from "react-dom/client";
import { App } from "./components/dashboard/App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(<App />);
