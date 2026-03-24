"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Waveform } from "@/components/waveform";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile?.isAdmin) {
      router.replace("/dashboard");
    }
  }, [loading, profile, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Waveform bars={5} size="md" />
      </div>
    );
  }

  if (!profile?.isAdmin) {
    return null;
  }

  return <>{children}</>;
}
