import { redirect } from "next/navigation";

export default function RecruiterLoginRedirect() {
  redirect("/login?role=recruiter");
}
