import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { AuthProvider } from "@/features/auth/auth-provider";
import { toPublicUser } from "@/features/auth/user-sync";
import { getCurrentUser } from "@/server/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const initialUser = user ? toPublicUser(user) : null;

  return (
    <AuthProvider initialUser={initialUser}>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 overflow-x-clip">{children}</main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
