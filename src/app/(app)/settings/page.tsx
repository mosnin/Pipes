import { redirect } from "next/navigation";

/** /settings has no page of its own: your account is the first thing under it. */
export default function SettingsIndexPage() {
  redirect("/settings/account");
}
