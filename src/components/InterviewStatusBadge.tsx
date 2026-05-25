import { InterviewStatus, INTERVIEW_STATUS_LABELS } from "@/lib/interviews";

const styles: Record<InterviewStatus, string> = {
  marcada: "bg-primary/15 text-primary border-primary/40",
  realizada: "bg-accent/15 text-accent border-accent/40",
  fechada: "bg-gold/20 text-gold border-gold/50",
  nao_compareceu: "bg-muted text-muted-foreground border-border",
  reagendada: "bg-bronze/15 text-bronze border-bronze/40",
  perdida: "bg-destructive/15 text-destructive border-destructive/40",
};

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-mono uppercase tracking-wider ${styles[status]}`}
    >
      {INTERVIEW_STATUS_LABELS[status]}
    </span>
  );
}
