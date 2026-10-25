import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loader from "@/app/_components/shared/loader";
import { AppShell } from "./_components/app-shell";

async function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");
  await auth.protect();
  const user = await currentUser();
  if (!user) redirect("/auth/sign-in");
  return (
    <AppShell
      name={user.firstName ?? "Minha conta"}
      email={user.primaryEmailAddress?.emailAddress ?? ""}
    >
      {children}
    </AppShell>
  );
}

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<Loader />}>
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}
