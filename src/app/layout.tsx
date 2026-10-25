import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { ptBR } from "@clerk/localizations";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/app/_components/ui/toast";
import { PwaProvider } from "@/app/_components/pwa/pwa-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const clerkLocalization = {
  ...ptBR,
  signIn: {
    ...ptBR.signIn,
    start: {
      ...ptBR.signIn?.start,
      title: "Bem-vindo(a) de volta!",
      subtitle: "Acesse sua conta para continuar.",
      titleCombined: "Entrar no Meu Trocado",
      subtitleCombined: "Acesse sua conta para continuar",
      actionText: "Ainda não tem uma conta?",
      actionLink: "Criar conta",
    },
  },
};

export const metadata: Metadata = {
  title: "meutrocado.",
  description: "Mais clareza para cuidar do seu dinheiro.",
  applicationName: "meutrocado.",
  appleWebApp: {
    capable: true,
    title: "meutrocado.",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#254b3e" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <PwaProvider>
          <ClerkProvider
            ui={ui}
            signInUrl="/auth/sign-in"
            signInFallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
            localization={clerkLocalization}
            appearance={{
              options: {
                unsafe_disableDevelopmentModeWarnings: true,
              },
            }}
          >
            <Toaster timeout={3500} limit={3}>
              {children}
            </Toaster>
          </ClerkProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
