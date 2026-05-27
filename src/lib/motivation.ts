export type PerformanceTier = "top" | "rising" | "struggling" | "neutral";

type Quote = { text: string; author: string };

const POOLS: Record<PerformanceTier, Quote[]> = {
  top: [
    {
      text: "Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que elas são difíceis.",
      author: "Sêneca",
    },
    {
      text: "Tu tens poder sobre a tua mente, não sobre os acontecimentos. Compreende isso, e encontrarás força.",
      author: "Marco Aurélio",
    },
    {
      text: "O sucesso de ontem não te pertence mais. O que importa é o que farás hoje.",
      author: "Adaptado de Marco Aurélio",
    },
    {
      text: "A disciplina é a ponte entre metas e realizações. Continue atravessando.",
      author: "Tradição estoica",
    },
    {
      text: "Aquele que avança sem parar, ainda que devagar, chega antes do que se detém para celebrar.",
      author: "Tradição estoica",
    },
  ],
  rising: [
    {
      text: "Pequenas coisas, feitas de modo constante, levam a grandes resultados.",
      author: "Tradição estoica",
    },
    { text: "Não diga que vai fazer. Faça.", author: "Epicteto" },
    {
      text: "Cada hábito e faculdade se forma e se fortalece pelo ato correspondente.",
      author: "Epicteto",
    },
    {
      text: "Bem-aventurado o homem que tem o hábito de fazer o que é necessário.",
      author: "Marco Aurélio",
    },
    {
      text: "O caminho para o topo é construído por quem decide subir mais um degrau hoje.",
      author: "Tradição estoica",
    },
  ],
  struggling: [
    { text: "Sofremos mais na imaginação do que na realidade.", author: "Sêneca" },
    { text: "O obstáculo é o caminho.", author: "Marco Aurélio" },
    {
      text: "Não são as coisas que perturbam os homens, mas a opinião que têm das coisas.",
      author: "Epicteto",
    },
    { text: "Comece. O resto vem com o trabalho.", author: "Tradição estoica" },
    {
      text: "Que mal há em recomeçar? Recomeça e vive melhor.",
      author: "Marco Aurélio",
    },
    {
      text: "A dificuldade revela o caráter. Continue: o pior dia também passa.",
      author: "Tradição estoica",
    },
    {
      text: "Não pedes que as coisas aconteçam como queres; quer que elas aconteçam como acontecem, e estarás em paz.",
      author: "Epicteto",
    },
  ],
  neutral: [
    {
      text: "Toda nova manhã é uma nova chance de fazer melhor.",
      author: "Tradição estoica",
    },
    {
      text: "Não desperdices o que resta da tua vida em opiniões alheias.",
      author: "Marco Aurélio",
    },
    {
      text: "Enquanto esperas viver, a vida passa.",
      author: "Sêneca",
    },
    {
      text: "A vida é longa o bastante se sabemos usá-la.",
      author: "Sêneca",
    },
  ],
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function pickQuote(sellerId: string, tier: PerformanceTier): Quote {
  const pool = POOLS[tier];
  const idx = hashString(`${sellerId}::${todayKey()}::${tier}`) % pool.length;
  return pool[idx];
}

export type PerformanceInput = {
  rank: number; // 1-based
  total: number; // total de vendedores
  deals: number;
  goalDeals: number;
};

export function classifyPerformance({
  rank,
  total,
  deals,
  goalDeals,
}: PerformanceInput): PerformanceTier {
  const goalPct = goalDeals > 0 ? deals / goalDeals : 0;
  const half = Math.ceil(total / 2);

  if (rank <= 3 || goalPct >= 1) return "top";

  // Critério "struggling": metade inferior do ranking ou desempenho muito baixo
  // depois da primeira semana do mês.
  const day = new Date().getDate();
  const pastFirstWeek = day > 7;
  if (rank > half || (pastFirstWeek && goalPct < 0.3)) return "struggling";

  if (goalPct >= 0.5 && goalPct < 1 && rank <= half) return "rising";

  return "neutral";
}

export const TIER_LABEL: Record<PerformanceTier, string> = {
  top: "Você está liderando",
  rising: "Você está subindo",
  struggling: "Estamos com você",
  neutral: "Mais um passo",
};