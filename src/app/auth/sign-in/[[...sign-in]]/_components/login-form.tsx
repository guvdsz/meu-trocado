import { SignIn } from "@clerk/nextjs";
import { LoginFormLoading } from "./login-form-loading";

const frameStyles = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  backgroundColor: "transparent",
  boxShadow: "none",
  border: 0,
  borderRadius: 0,
  padding: 0,
};

export function LoginForm() {
  return (
    <div className="login-clerk">
      <SignIn
        fallback={<LoginFormLoading />}
        routing="path"
        path="/auth/sign-in"
        forceRedirectUrl="/"
        signUpForceRedirectUrl="/"
        appearance={{
          variables: {
            colorPrimary: "#254b3e",
            colorPrimaryForeground: "#ffffff",
            colorForeground: "#22372d",
            colorMutedForeground: "#526548",
            colorBackground: "#ffffff",
            colorInput: "#ffffff",
            colorInputForeground: "#22372d",
            colorDanger: "#b94e40",
            borderRadius: "0.75rem",
            fontFamily: "var(--font-geist-sans)",
            fontFamilyButtons: "var(--font-geist-sans)",
          },
          elements: {
            rootBox: frameStyles,
            cardBox: frameStyles,
            card: frameStyles,
            header: { display: "none" },
            main: { gap: "20px" },
            socialButtonsBlockButton: {
              minHeight: "54px",
              border: "1px solid #dfe5d6",
              borderRadius: "11px",
              boxShadow: "none",
              backgroundColor: "#ffffff",
              color: "#22372d",
              "&:hover": { backgroundColor: "#f7f8f4" },
            },
            socialButtonsBlockButtonText: {
              fontSize: "16px",
              fontWeight: 550,
            },
            footer: {
              background: "transparent",
              boxShadow: "none",
              border: 0,
              marginTop: "18px",
            },
            footerAction: { display: "none" },
            formFieldInput: "h-12 border-stone-200 shadow-none",
            formButtonPrimary: "h-12 rounded-xl shadow-none",
            dividerLine: "bg-stone-200",
            dividerText: "text-stone-400",
            identityPreviewEditButton: "text-emerald-900",
          },
          options: {
            socialButtonsPlacement: "top",
            socialButtonsVariant: "blockButton",
          },
        }}
      />
    </div>
  );
}
