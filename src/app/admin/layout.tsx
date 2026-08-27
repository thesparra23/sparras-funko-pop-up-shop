import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: claimsData,
  } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/login");
  }

  return children;
}