import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
          name: data.user.user_metadata?.full_name ?? data.user.email ?? "",
          avatarUrl: data.user.user_metadata?.avatar_url ?? null,
        });
      }
    });
  }, []);

  return user;
}
