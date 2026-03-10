import { createClient, type Session, type User } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hveankwjtfvcztcrurlm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWFua3dqdGZ2Y3p0Y3J1cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzExNTQsImV4cCI6MjA4ODY0NzE1NH0.fyfBlM_kknWTD6hI_hP7CYfjmYZXSZZc9I1cZRf6URE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type UserTier = "free" | "pro";

export async function signUp(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export function isOwnerMode(): boolean {
  return process.env.NEXT_PUBLIC_OWNER_MODE === "true";
}

export async function getUserTier(): Promise<UserTier> {
  if (isOwnerMode()) return "pro";

  const session = await getSession();
  if (!session) return "free";

  const { data, error } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", session.user.id)
    .single();

  if (error || !data) return "free";
  return (data.tier as UserTier) || "free";
}

export async function openCheckout(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-checkout`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  const url = data.url;

  if (url) {
    // Open in system browser (Electron) or new tab (web)
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  }

  return url;
}

export function onAuthStateChange(
  callback: (session: Session | null) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}
