import { createFileRoute } from "@tanstack/react-router";
import { RankingView } from "@/components/RankingView";

export const Route = createFileRoute("/ranking")({
  component: RankingView,
  head: () => ({
    meta: [
      { title: "Ranking — Arena United" },
      { name: "description", content: "Ranking completo da equipe comercial." },
    ],
  }),
});