"use client";

import { useState } from "react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/components/auth-provider";
import { Send } from "lucide-react";
import { toast } from "sonner";

export default function HelpPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setSending(true);

    // mailto fallback — 실제 백엔드 이메일 API 연동 전까지
    const email = user?.email || "";
    const mailtoUrl = `mailto:help@soundril.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `From: ${email}\n\n${description}`
    )}`;
    window.open(mailtoUrl, "_blank");

    toast.success("Your email client has been opened. Please send the email.");
    setSending(false);
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="container max-w-2xl pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Contact Support</h1>
          <p className="text-muted-foreground mt-2">
            Need help? We typically respond within 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Your email address</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you need help with?"
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please enter the details of your request. A member of our support staff will respond as soon as possible."
              rows={8}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Attachments <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <label className="flex items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/40 p-6 cursor-pointer transition-colors">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const names = Array.from(e.target.files || []).map((f) => f.name);
                  if (names.length) toast.info(`${names.length} file(s) selected: ${names.join(", ")}`);
                }}
              />
              <p className="text-sm text-muted-foreground">Add file or drop files here</p>
            </label>
          </div>

          <button
            type="submit"
            disabled={sending || !subject.trim() || !description.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed h-11 px-6 transition-colors"
          >
            <Send className="h-4 w-4" />
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
