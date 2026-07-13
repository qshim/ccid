// cciD Lab — private research operations. The proxy already gates this route;
// this server component re-verifies the session (defense in depth) so the page
// never renders for an unauthenticated request even if the proxy matcher drifts.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "@/app/lab/lib/session";
import LabClient from "./LabClient";

export const metadata = {
  title: "cciD Lab — Research Operations",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LabPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await verifySession(process.env.SESSION_SECRET, token);
  if (!session) redirect("/lab/login");

  return <LabClient />;
}
