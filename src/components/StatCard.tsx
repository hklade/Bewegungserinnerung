export function StatCard(props: {
  label: string;
  value: string;
  note: string;
  tone: "green" | "orange" | "blue" | "red";
}) {
  return (
    <article className={`stat-card tone-${props.tone}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <small>{props.note}</small>
    </article>
  );
}
