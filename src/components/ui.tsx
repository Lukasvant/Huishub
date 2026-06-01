import clsx from "clsx";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition",
        variant === "primary" &&
          "border border-sage-500 bg-sage-100 text-ink hover:bg-sage-500 hover:text-white",
        variant === "secondary" &&
          "border border-line bg-transparent text-ink hover:border-sage-500 hover:bg-sage-50",
        variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        variant === "ghost" && "text-muted hover:bg-sage-50 hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-[1.75rem] border border-line bg-panel p-4 shadow-calm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
      <div>
        <p className="eyebrow">HuisHub</p>
        <h1 className="mt-1 text-4xl leading-none sm:text-5xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm uppercase tracking-[0.12em] text-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-line px-5 py-9 text-center">
      <p className="font-serif text-2xl font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}

export function Message({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "info" | "success";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-xl px-3 py-2.5 text-sm",
        tone === "error" && "bg-red-50 text-red-700",
        tone === "info" && "bg-sage-50 text-sage-600",
        tone === "success" && "bg-green-50 text-green-700",
      )}
    >
      {children}
    </div>
  );
}

export function LoadingScreen({ text = "Laden..." }: { text?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
      {text}
    </div>
  );
}
