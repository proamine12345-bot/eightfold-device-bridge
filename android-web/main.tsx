import { createRoot } from "react-dom/client";
import { Home } from "../src/routes/index";
import "../src/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Ayman Remote root element is missing");

createRoot(root).render(<Home />);
