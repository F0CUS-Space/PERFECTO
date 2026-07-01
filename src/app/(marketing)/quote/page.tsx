import { redirect } from "next/navigation";

/** Quote flow is now part of Book Now. */
export default function QuotePage() {
  redirect("/book");
}
