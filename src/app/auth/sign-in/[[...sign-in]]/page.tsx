import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import Loader from "@/app/_components/shared/loader";

export default function SignInPage() {
    return (
        <main className="flex min-h-0 flex-1 items-center justify-center bg-[#fffdf7] px-4 py-12">
            <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-2xl shadow-emerald-950/10 lg:grid-cols-[0.9fr_1.1fr]">
                <section className="relative hidden overflow-hidden bg-teal-800 p-12 text-white lg:block">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lime-300/30" />
                    <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-rose-300/20" />
                    <div className="relative flex h-full flex-col justify-between">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.25em] text-lime-300">
                                Meu Troco
                            </p>
                            <h1 className="mt-16 max-w-sm text-5xl font-bold leading-tight">
                                Seu dinheiro no lugar certo.
                            </h1>
                            <p className="mt-6 max-w-sm text-lg leading-8 text-teal-50">
                                Entre para acompanhar suas contas, organizar
                                seus gastos e fazer seu dinheiro render mais.
                            </p>
                        </div>
                        <p className="text-sm text-teal-100">
                            Mais clareza para o seu bolso. Sem complicação.
                        </p>
                    </div>
                </section>
                <section className="flex min-h-[40rem] items-center justify-center p-6 sm:p-12">
                    <Suspense fallback={<Loader />}>
                        <ClerkLoading>
                            <Loader />
                        </ClerkLoading>
                        <ClerkLoaded>
                            <SignIn
                                appearance={{
                                    variables: {
                                        colorPrimary: "#0f766e",
                                        colorPrimaryForeground: "#ffffff",
                                        colorForeground: "#134e4a",
                                        colorMutedForeground: "#53706d",
                                        colorBackground: "#ffffff",
                                        colorInput: "#f8fffc",
                                        colorInputForeground: "#134e4a",
                                        colorDanger: "#be123c",
                                        borderRadius: "0.75rem",
                                        fontFamily: "var(--font-geist-sans)",
                                        fontFamilyButtons:
                                            "var(--font-geist-sans)",
                                    },
                                    elements: {
                                        rootBox: "w-full",
                                        card: "w-full max-w-md border-0 bg-transparent p-0 shadow-none",
                                        headerTitle:
                                            "text-3xl font-bold tracking-tight text-teal-950",
                                        headerSubtitle: "text-teal-700",
                                        socialButtonsBlockButton:
                                            "h-11 border-emerald-100 bg-white text-teal-900 shadow-sm hover:bg-emerald-50",
                                        socialButtonsBlockButtonText:
                                            "font-semibold text-teal-900",
                                        dividerLine: "bg-emerald-100",
                                        dividerText:
                                            "text-xs font-medium uppercase tracking-wider text-teal-600",
                                        formFieldLabel:
                                            "font-semibold text-teal-900",
                                        formFieldInput:
                                            "h-11 border-emerald-100 bg-emerald-50/30 text-teal-950 shadow-none focus:border-teal-600 focus:ring-teal-600",
                                        formButtonPrimary:
                                            "h-11 bg-teal-700 font-bold shadow-lg shadow-teal-900/15 hover:bg-teal-800",
                                        footerAction: "!hidden",
                                        identityPreviewEditButton:
                                            "text-teal-700 hover:text-teal-900",
                                    },
                                    options: {
                                        socialButtonsPlacement: "top",
                                        socialButtonsVariant: "blockButton",
                                        unsafe_disableDevelopmentModeWarnings: true,
                                    },
                                }}
                            />
                        </ClerkLoaded>
                    </Suspense>
                </section>
            </div>
        </main>
    );
}
