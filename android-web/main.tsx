import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { Home } from "../src/routes/index";
import { Toaster } from "../src/components/ui/sonner";
import "../src/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Ayman Remote root element is missing");

const queryClient = new QueryClient();

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <Home />
    <Toaster position="top-center" />
  </QueryClientProvider>,
);
