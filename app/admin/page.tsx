import { redirect } from "next/navigation";

/**
 * /admin — dedicated admin entry.
 *
 * The public /login card only offers Student + Recruiter tabs; admins are
 * provisioned accounts and sign in here. The surrounding AdminLayout already
 * gates access: unauthenticated visitors are redirected to the role-locked
 * login (`?role=admin`) and non-admins to their own home, so by the time this
 * page renders the caller is a verified admin — send them to the console.
 */
export default function AdminEntry() {
  redirect("/admin/today");
}
