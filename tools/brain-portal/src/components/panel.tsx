import type { ReactNode } from "react";

export function Panel(props: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={[
        "rounded-2xl border border-[color:var(--cm-panel-border)] bg-[color:var(--cm-panel)]",
        "shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl",
        "px-4 py-4",
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

