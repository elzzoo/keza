"use client";

import { useState } from "react";

interface Props {
  lang: "fr" | "en";
}

const T = {
  fr: {
    name: "Nom",
    company: "Entreprise",
    email: "Email professionnel",
    teamSize: "Taille de l'équipe",
    message: "Message (optionnel)",
    teamSizeOptions: [
      { value: "", label: "Sélectionner…" },
      { value: "1-10", label: "1–10 collaborateurs" },
      { value: "11-50", label: "11–50 collaborateurs" },
      { value: "51-200", label: "51–200 collaborateurs" },
      { value: "201+", label: "201+ collaborateurs" },
    ],
    submit: "Demander une démo →",
    submitting: "Envoi en cours…",
    successTitle: "Demande reçue !",
    successMsg: "Notre équipe vous contacte sous 24h.",
    errorMsg: "Une erreur est survenue. Veuillez réessayer ou écrire à contact@keza.app.",
    placeholder: {
      name: "Marie Dupont",
      company: "Acme Corp",
      email: "marie@acme.com",
      message: "Nous avons ~30 collaborateurs en déplacement régulier…",
    },
  },
  en: {
    name: "Name",
    company: "Company",
    email: "Work email",
    teamSize: "Team size",
    message: "Message (optional)",
    teamSizeOptions: [
      { value: "", label: "Select…" },
      { value: "1-10", label: "1–10 employees" },
      { value: "11-50", label: "11–50 employees" },
      { value: "51-200", label: "51–200 employees" },
      { value: "201+", label: "201+ employees" },
    ],
    submit: "Request a demo →",
    submitting: "Sending…",
    successTitle: "Request received!",
    successMsg: "Our team will reach out within 24 hours.",
    errorMsg: "Something went wrong. Please try again or email contact@keza.app.",
    placeholder: {
      name: "Jane Smith",
      company: "Acme Corp",
      email: "jane@acme.com",
      message: "We have ~30 employees traveling regularly…",
    },
  },
};

const EMPTY_FORM = { name: "", company: "", email: "", teamSize: "", message: "" };

export function ContactForm({ lang }: Props) {
  const t = T[lang];
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [form, setForm] = useState(EMPTY_FORM);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("server_error");
      setStatus("done");
      setForm(EMPTY_FORM);
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-3 animate-fade-up">
        <div className="w-12 h-12 rounded-full bg-success/15 border border-success/25 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-bold text-fg text-lg">{t.successTitle}</h3>
        <p className="text-muted text-sm">{t.successMsg}</p>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-bg border border-border text-fg text-sm placeholder:text-subtle focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all duration-150";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">{t.name}</label>
          <input
            type="text"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            placeholder={t.placeholder.name}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">{t.company}</label>
          <input
            type="text"
            name="company"
            required
            value={form.company}
            onChange={handleChange}
            placeholder={t.placeholder.company}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">{t.email}</label>
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder={t.placeholder.email}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">{t.teamSize}</label>
          <select
            name="teamSize"
            required
            value={form.teamSize}
            onChange={handleChange}
            className={inputClass}
          >
            {t.teamSizeOptions.map((o) => (
              <option key={o.value} value={o.value} disabled={o.value === ""}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1.5">{t.message}</label>
        <textarea
          name="message"
          rows={3}
          value={form.message}
          onChange={handleChange}
          placeholder={t.placeholder.message}
          className={inputClass + " resize-none"}
        />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm tracking-wide transition-all duration-150 disabled:opacity-60 shadow-blue-sm hover:shadow-blue press-effect"
      >
        {status === "sending" ? t.submitting : t.submit}
      </button>

      {status === "error" && (
        <p className="text-xs text-red-400 text-center">
          {t.errorMsg}{" "}
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="underline hover:no-underline"
          >
            {lang === "fr" ? "Réessayer" : "Retry"}
          </button>
        </p>
      )}
    </form>
  );
}
