import { AlertTriangle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePhoneForm } from "@/features/dashboard/components/change-phone-form";
import { ProfileForm } from "@/features/dashboard/components/profile-form";
import { toPublicUser } from "@/features/auth/user-sync";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile",
};

export default async function DashboardProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const publicUser = toPublicUser(user);

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Profile</h1>
      <p className="mt-2 text-muted-foreground">Update your account details.</p>

      <div className="mt-8 grid gap-6 lg:max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <CardDescription>Name and email for receipts and communication.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm user={publicUser} />
          </CardContent>
        </Card>

        <ChangePhoneForm currentPhone={user.phone} />

        {user.email && !user.emailVerifiedAt && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-brand-navy">Email not verified</p>
              <p className="mt-1 text-muted-foreground">
                Check your inbox for a verification link sent to {user.email}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
