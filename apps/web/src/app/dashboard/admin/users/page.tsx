"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Users, Search, Coins } from "lucide-react";
import { Waveform } from "@/components/waveform";

interface UserItem {
  id: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  credits: number;
  totalCreditsUsed: number;
  subscription: { productId: string; status: string } | null;
  createdAt: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchUsers = useCallback(
    async (searchTerm: string, cursor?: string) => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      params.set("limit", "50");
      if (cursor) params.set("startAfter", cursor);

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<{ users: UserItem[]; hasMore: boolean }>;
    },
    []
  );

  const doSearch = useCallback(
    (term: string) => {
      setLoading(true);
      fetchUsers(term).then((data) => {
        setUsers(data.users);
        setHasMore(data.hasMore);
        setLoading(false);
      });
    },
    [fetchUsers]
  );

  useEffect(() => {
    doSearch("");
  }, [doSearch]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const lastId = users[users.length - 1]?.id;
    const data = await fetchUsers(search, lastId);
    setUsers((prev) => [...prev, ...data.users]);
    setHasMore(data.hasMore);
    setLoadingMore(false);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4.5 w-4.5 text-primary" />
          </div>
          Users
        </h1>
        <p className="text-muted-foreground mt-2">
          Browse and manage user accounts
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by email..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border/60 bg-card text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Waveform bars={5} size="md" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border/60 bg-card">
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/dashboard/admin/users/${user.id}`}
              className="flex items-center gap-4 rounded-lg border border-border/60 bg-card p-4 hover:border-primary/30 transition-colors"
            >
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt=""
                  className="h-10 w-10 rounded-full shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium shrink-0">
                  {user.displayName?.[0] || user.email?.[0] || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {user.displayName || user.email || user.id}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user.email}
                  {user.createdAt
                    ? ` · Joined ${new Date(user.createdAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Coins className="h-3.5 w-3.5 text-primary" />
                  {user.credits}
                </div>
                {user.subscription && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {user.subscription.status}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full mt-4 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
