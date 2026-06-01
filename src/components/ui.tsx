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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition",
        variant === "primary" && "bg-sage-500 text-white hover:bg-sage-600",
        variant === "secondary" &&
          "border border-stone-200 bg-white text-ink hover:bg-stone-50",
        variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        variant === "ghost" && "text-muted hover:bg-stone-100 hover:text-ink",
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
        "rounded-2xl border border-stone-100 bg-panel p-4 shadow-calm",
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
    <header className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-9 text-center">
      <p className="font-medium">{title}</p>
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
