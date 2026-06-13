"use client";

import { useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";

export default function ApiWaitlistForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function submitWaitlist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      const response = await fetch("/api/api-waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, source: "api-doc" }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      setIsSuccess(Boolean(data.ok));
      setMessage(data.message ?? "Thanks. We saved your request.");

      if (data.ok) {
        setEmail("");
      }
    } catch {
      setIsSuccess(false);
      setMessage("Could not join the waitlist right now. Try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submitWaitlist}
      className="rounded-md border border-[#d7bca9] bg-white/75 p-4 shadow-xl backdrop-blur dark:border-white/10 dark:bg-black/20"
    >
      <div className="nf-sunset-band mb-4" />
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 via-pink-500 to-violet-600 text-white">
          <Mail className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="pb-1 text-lg font-black">Join the API waitlist</h2>
          <p className="text-xs leading-5 text-[#6d5d54] dark:text-[#d4c6bd]">
            Get a note when developer access is ready for early testers.
          </p>
        </div>
      </div>

      <label
        htmlFor="api-waitlist-email"
        className="mt-5 block text-[10px] font-bold uppercase text-muted-foreground"
      >
        Email
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="api-waitlist-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-md border border-[#d7c1ad] bg-white/85 px-3 py-2 text-sm font-medium outline-none transition placeholder:text-muted-foreground focus:border-pink-400 focus:ring-2 focus:ring-pink-200 dark:border-white/10 dark:bg-black/20 dark:focus:ring-pink-500/20"
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="nf-button-primary px-3"
          title="Join API waitlist"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Join</span>
        </button>
      </div>

      {message && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold ${
            isSuccess
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
