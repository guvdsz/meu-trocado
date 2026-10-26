import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { httpDatabase } from "@/db/http";
import { resolveUser } from "@/db/queries/users";

export class IdentityError extends Error {}

export const requireIdentity = cache(async () => {
  const session = await auth();
  if (!session.userId)
    throw new IdentityError("Entre na sua conta para continuar.");
  const [localUser] = await resolveUser(httpDatabase(), session.userId);
  return { userId: localUser.id };
});

export const requireUser = cache(async () => {
  const [identity, user, session] = await Promise.all([
    requireIdentity(),
    currentUser(),
    auth(),
  ]);
  if (!user || user.id !== session.userId)
    throw new IdentityError("Sua sessão expirou. Entre novamente.");
  return {
    ...identity,
    name: user.firstName ?? "por aqui",
    email: user.primaryEmailAddress?.emailAddress ?? "",
  };
});

export type UserIdentity = Awaited<ReturnType<typeof requireIdentity>>;
