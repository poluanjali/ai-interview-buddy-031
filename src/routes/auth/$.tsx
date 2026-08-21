import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "./login";

export const Route = createFileRoute("/auth/$")({
  head: () => ({
    meta: [
      { title: "Sign in — MockMate" },
      { name: "description", content: "Sign in or create a MockMate account to start practicing placement interviews." },
    ],
  }),
  component: AuthPage,
});
