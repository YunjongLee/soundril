"use client";

import { useState } from "react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/lib/i18n";
import { Send, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

export default function HelpPage() {
  const { user } = useAuth();
  const { t } = useT();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error(t("common.fillAllFields"));
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      formData.append("email", user?.email || "");
      formData.append("subject", subject);
      formData.append("description", description);
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error();

      toast.success(t("help.messageSent"));
      setSubject("");
      setDescription("");
      setFiles([]);
    } catch {
      toast.error(t("common.somethingWentWrong"));
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="container max-w-2xl pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("help.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("help.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">{t("help.emailAddress")}</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("help.subject")}</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("help.subjectPlaceholder")}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("help.description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("help.descriptionPlaceholder")}
              rows={8}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t("help.attachments")} <span className="text-muted-foreground font-normal">{t("help.optional")}</span>
            </label>
            <label className="flex items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/40 p-6 cursor-pointer transition-colors">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  if (selected.length) {
                    setFiles((prev) => [...prev, ...selected]);
                  }
                  e.target.value = "";
                }}
              />
              <p className="text-sm text-muted-foreground">{t("help.addFile")}</p>
            </label>
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-xs shrink-0">{(f.size / 1024).toFixed(0)}KB</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="p-0.5 rounded hover:bg-muted shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={sending || !subject.trim() || !description.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed h-11 px-6 transition-colors"
          >
            <Send className="h-4 w-4" />
            {t("help.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
