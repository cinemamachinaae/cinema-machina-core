import type { ReactNode } from "react";

export function Panel(props: {
  title?: string;
  children: ReactNode;
  className?: string;
  glow?: "cyan" | "green" | "amber" | "rose" | "blue" | null;
}) {
  const glowMap: Record<string, string> = {
    cyan: "shadow-[0_0_40px_rgba(0,229,255,0.06)]",
    green: "shadow-[0_0_40px_rgba(16,185,129,0.06)]",
    amber: "shadow-[0_0_40px_rgba(245,158,11,0.06)]",
    rose: "shadow-[0_0_40px_rgba(244,63,94,0.06)]",
    blue: "shadow-[0_0_40px_rgba(59,130,246,0.06)]",
  };

  const glowClass = props.glow ? glowMap[props.glow] ?? "" : "";

  return (
    <section
      className={[
        "rounded-2xl border border-[color:var(--cm-panel-border)] bg-[color:var(--cm-panel)]",
        "shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl",
        "px-4 py-4",
        glowClass,
        "transition-shadow duration-700",
        props.className ?? "",
      ].join(" ")}
    >
      {props.title ? (
        <header className="mb-3">
          <div className="text-[11px] tracking-[0.18em] uppercase text-[color:var(--cm-text-faint)]">
            {props.title}
          </div>
        </header>
      ) : null}
      {props.children}
    </section>
  );
}
