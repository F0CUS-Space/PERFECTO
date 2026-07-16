import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { AuthProvider } from "@/features/auth/auth-provider";
import { toPublicUser } from "@/features/auth/user-sync";
import { getCurrentUser } from "@/server/auth";

// Auth layout reads session cookies — must be dynamic. Child pages that set
// `revalidate` / `generateStaticParams` otherwise throw DYNAMIC_SERVER_USAGE in production.
export const dynamic = "force-dynamic";

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
