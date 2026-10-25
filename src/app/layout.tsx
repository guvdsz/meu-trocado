import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
            titleCombined: "Entrar no Meu Troco",
            subtitleCombined: "Acesse sua conta para continuar",
            actionText: "Ainda não tem uma conta?",
            actionLink: "Criar conta",
        },
    },
};

export const metadata: Metadata = {
    title: "Meu Troco",
    description: "Mais clareza para cuidar do seu dinheiro.",
};

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
                <ClerkProvider
                    localization={clerkLocalization}
                    appearance={{
                        options: {
                            unsafe_disableDevelopmentModeWarnings: true,
                        },
                    }}
                >
                    {children}
                </ClerkProvider>
            </body>
        </html>
    );
}
