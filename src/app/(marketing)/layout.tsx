import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { toPublicUser } from "@/features/auth/user-sync";
import { getCurrentUser } from "@/server/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar initialUser={user ? toPublicUser(user) : null} />
      <main className="flex-1 overflow-x-clip">{children}</main>
      <Footer />
    </div>
  );
}
