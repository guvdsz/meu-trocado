import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getGoogleId } from "./google-identity";

export class IdentityError extends Error {}

export async function requireGoogleIdentity() {
  const session = await auth();
  if (!session.userId)
    throw new IdentityError("Entre na sua conta para continuar.");
  const user = await currentUser();
  if (!user || user.id !== session.userId)
    throw new IdentityError("Sua sessão expirou. Entre novamente.");
  const googleId = getGoogleId(user.externalAccounts);
  if (!googleId)
    throw new IdentityError(
      "Conecte uma única conta Google ao seu perfil para acessar suas finanças.",
    );
  return {
    clerkUserId: user.id,
    googleId,
    name: user.firstName ?? "por aqui",
    email: user.primaryEmailAddress?.emailAddress ?? "",
  };
}

export type GoogleIdentity = Awaited<ReturnType<typeof requireGoogleIdentity>>;
