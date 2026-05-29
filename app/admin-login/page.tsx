import { redirect } from "next/navigation";

// The standalone arcade-styled admin terminal (with fake client-side 2FA) is
// retired. Admin auth now flows through the unified, design-system login, which
// already exposes the Admin role and routes authenticated admins to
// /admin/today. Keeping this path as a redirect preserves any bookmarks.
export default function AdminLoginRedirect() {
  redirect("/login?role=admin");
}
