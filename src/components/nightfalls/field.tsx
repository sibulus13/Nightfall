import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "~/lib/utils";

export function FieldShell({ className, ...props }: ComponentPropsWithoutRef<"main">) {
  return <main className={cn("nf-shell", className)} {...props} />;
}

export function FieldPage({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("nf-page", className)} {...props} />;
}

export function FieldPanel({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return <section className={cn("nf-panel", className)} {...props} />;
}

export function FieldCard({
  className,
  ...props
}: ComponentPropsWithoutRef<"article">) {
  return <article className={cn("nf-card", className)} {...props} />;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="nf-section-label">{children}</div>;
}

export function FieldLinkButton({
  className,
  variant = "primary",
  ...props
}: ComponentPropsWithoutRef<typeof Link> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      className={cn(
        variant === "primary" ? "nf-button-primary" : "nf-button-secondary",
        className,
      )}
      {...props}
    />
  );
}
