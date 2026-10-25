import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { withDatabase } from "@/db";
import { resolveUser } from "@/db/queries/users";

export class IdentityError extends Error {}

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session.userId)
    throw new IdentityError("Entre na sua conta para continuar.");
  const user = await currentUser();
  if (!user || user.id !== session.userId)
    throw new IdentityError("Sua sessão expirou. Entre novamente.");
  const [localUser] = await withDatabase((db) => resolveUser(db, user.id));
  return {
    userId: localUser.id,
    name: user.firstName ?? "por aqui",
    email: user.primaryEmailAddress?.emailAddress ?? "",
  };
});

export type UserIdentity = Awaited<ReturnType<typeof requireUser>>;
