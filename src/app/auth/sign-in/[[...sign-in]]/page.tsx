import { Suspense } from "react";
import { Brand } from "@/app/_components/shared/brand";
import { Icon } from "@/app/_components/shared/icon";
import { LoginForm } from "./_components/login-form";
import { LoginFormLoading } from "./_components/login-form-loading";

export default function SignInPage() {
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand light />
        <div className="login-story-content">
          <h1>
            Seu dinheiro
            <br />
            merece um
            <br />
            <span>novo olhar.</span>
          </h1>
          <p>
            Do café de todo dia aos planos lá na frente.
            <br />
            Cuide de cada trocado, do seu jeito.
          </p>
          <div className="login-illustration" aria-hidden="true">
            <div className="illustration-orbit" />
            <div className="illustration-orbit orbit-two" />
            <div className="illustration-card">
              <div>
                <span className="illustration-icon">
                  <Icon name="wallet" />
                </span>
                <span>UM PASSO DE CADA VEZ</span>
                <Icon name="spark" />
              </div>
              <strong>
                Mais leveza.
                <br />
                Mais controle.
              </strong>
              <div className="illustration-bars">
                {[30, 48, 39, 66, 57, 84, 100].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="illustration-caption">
                <span className="live-dot" />
                Seu futuro começa no presente.
              </div>
            </div>
            <div className="floating-note">
              <span>
                <Icon name="check" />
              </span>
              <div>
                Pequenos hábitos.<strong>Grandes mudanças.</strong>
              </div>
            </div>
            <div className="coin coin-one">$</div>
            <div className="coin coin-two">$</div>
          </div>
        </div>
        <div className="login-story-footer">
          <span>Seu dinheiro, no seu ritmo.</span>
          <span>© 2026 Meu Trocado</span>
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-mobile-brand">
          <Brand />
        </div>
        <div className="login-form-content">
          <header className="login-form-heading">
            <h2>
              Seu trocado, organizado<span>.</span>
            </h2>
            <p className="login-description">
              Entre com sua conta Google para acompanhar seu saldo e suas
              movimentações.
            </p>
          </header>
          <Suspense
            fallback={
              <div className="login-clerk">
                <LoginFormLoading />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
          <div className="login-trust">
            <Icon name="shield" width="20" height="20" aria-hidden="true" />
            <p>
              Seu espaço é só seu.
              <br />
              <span>Acesso seguro com sua conta Google.</span>
            </p>
          </div>
        </div>
        <footer className="login-form-footer">
          Organizar o hoje. Deixar o amanhã mais leve.
        </footer>
      </section>
    </main>
  );
}
