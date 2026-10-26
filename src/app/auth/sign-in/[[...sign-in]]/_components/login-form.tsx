"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { LoginFormLoading } from "./login-form-loading";
import { LoginHeading } from "./login-heading";

const frameStyles = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  backgroundColor: "transparent",
  boxShadow: "none",
  border: 0,
  borderRadius: 0,
  // Clerk's card normally overlaps its frame by 1px; without the frame border
  // that negative margin puts the input's left edge outside the clipping area.
  margin: 0,
  padding: 0,
};

export function LoginForm() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const showLoading = !isLoaded || isSignedIn;
  const isStart = pathname.replace(/\/$/, "") === "/auth/sign-in";

  return (
    <>
      {isStart && <LoginHeading />}
      <div className="login-clerk relative min-h-60 w-full min-w-0 text-base" aria-busy={showLoading}>
        {/* Keep Clerk mounted so its session activation and redirect can finish. */}
        <div className={showLoading ? "invisible pointer-events-none" : undefined} inert={showLoading} aria-hidden={showLoading || undefined}>
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
              // Only the initial screen uses our introduction. Later steps need
              // Clerk's own instructions (verification, password recovery, etc.).
              header: isStart
                ? { display: "none" }
                : { gap: "12px", textAlign: "center" },
              headerTitle: { fontSize: "26px", lineHeight: "1.25" },
              headerSubtitle: { fontSize: "16px", lineHeight: "1.6" },
              main: { gap: "20px" },
              socialButtons: { display: "none" },
              dividerRow: { display: "none" },
              footer: {
                background: "transparent",
                boxShadow: "none",
                border: 0,
                marginTop: "18px",
              },
              footerAction: { justifyContent: "center" },
              otpCodeFieldInputs: { gap: "8px", justifyContent: "center" },
              otpCodeFieldInput: {
                width: "clamp(30px, 9vw, 44px) !important",
                height: "48px !important",
                maxHeight: "48px",
                flexShrink: 0,
                padding: 0,
                fontSize: "20px",
                backgroundColor: "#ffffff",
                border: "1px solid #b6c2ac",
                borderWidth: "1px !important",
                borderRadius: "10px",
                boxShadow: "none !important",
                outline: "none",
                transition: "border-color 180ms ease, box-shadow 180ms ease",
                "&:hover": { borderColor: "#8e9f81" },
                // OTP slots are visual segments of one input, not focusable inputs.
                "&[data-focus-within='true']": {
                  borderColor: "#557a43",
                  boxShadow: "inset 0 0 0 1px #557a43 !important",
                },
                "&[aria-invalid='true'], &[data-feedback='error']": {
                  borderColor: "#b94e40",
                },
                "&[aria-invalid='true'][data-focus-within='true'], &[data-feedback='error'][data-focus-within='true']": {
                  boxShadow: "inset 0 0 0 1px #b94e40 !important",
                },
                "@media (prefers-reduced-motion: reduce)": { transition: "none" },
              },
              formResendCodeLink: { fontSize: "14px", lineHeight: "1.5" },
              formFieldInput: {
                height: "48px",
                minHeight: "48px",
                border: "1px solid #b6c2ac",
                // Clerk's input variant otherwise replaces the border with an outer shadow.
                borderWidth: "1px !important",
                borderRadius: "12px",
                boxShadow: "none !important",
                outline: "none",
                paddingBlock: "11px",
                paddingInlineStart: "12px",
                fontSize: "16px",
                transition: "border-color 180ms ease, box-shadow 180ms ease",
                "&:hover": { borderColor: "#8e9f81" },
                "&:focus, &:focus-visible": {
                  borderColor: "#557a43",
                  boxShadow: "inset 0 0 0 1px #557a43 !important",
                  outline: "none",
                },
                "&[aria-invalid='true']": { borderColor: "#b94e40" },
                "&[aria-invalid='true']:focus": {
                  boxShadow: "inset 0 0 0 1px #b94e40 !important",
                },
                "@media (prefers-reduced-motion: reduce)": {
                  transition: "none",
                },
                "&[type='checkbox']": {
                  width: "20px",
                  height: "20px",
                  minHeight: "20px",
                  maxHeight: "20px",
                  flexShrink: 0,
                  alignSelf: "center",
                  margin: 0,
                  padding: 0,
                  borderRadius: "5px",
                  cursor: "pointer",
                  "&:checked": { borderColor: "#254b3e" },
                  "&:focus-visible": {
                    outline: "2px solid #557a43",
                    outlineOffset: "2px",
                  },
                },
              },
              formFieldRadioLabel: {
                "&[for='signOutOfOtherSessions-field']": {
                  minHeight: "20px",
                  justifyContent: "center",
                  cursor: "pointer",
                },
              },
              formFieldInput__password: { paddingInlineEnd: "56px" },
              formFieldInputShowPasswordButton: {
                top: "50%",
                bottom: "auto",
                right: "4px",
                transform: "translateY(-50%)",
                width: "40px",
                height: "40px",
                minHeight: "40px",
                padding: "12px",
                borderRadius: "8px",
                "&:focus-visible": {
                  outline: "none",
                  boxShadow: "inset 0 0 0 2px #557a43",
                },
              },
              formButtonPrimary: "h-12 rounded-xl shadow-none",
              identityPreviewEditButton: "text-emerald-900",
            },
          }}
        />
        </div>
        {showLoading && (
          <div className="absolute inset-0">
            <LoginFormLoading message={isSignedIn ? "Abrindo sua visão geral…" : undefined} />
          </div>
        )}
      </div>
    </>
  );
}
