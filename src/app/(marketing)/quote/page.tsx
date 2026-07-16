import { redirect } from "next/navigation";

/** Public quoting now goes through contact / staff estimates. */
export default function QuotePage() {
  redirect("/contact?intent=estimate");
}
