import { Suspense } from "react";
import { Brand } from "@/app/_components/shared/brand";
import { Icon } from "@/app/_components/shared/icon";
import { LoginForm } from "./_components/login-form";
import { LoginFormLoading } from "./_components/login-form-loading";
import { LoginHeading } from "./_components/login-heading";

export default function SignInPage() {
  return (
    <main className="login-page grid min-h-screen grid-cols-[1.02fr_1fr] bg-[#fbfcf8] max-[900px]:min-h-svh max-[900px]:grid-cols-1">
      <section className="login-story relative flex min-h-screen flex-col overflow-hidden bg-primary px-[60px] pt-10 pb-[27px] text-white [&>.brand]:text-[28px] [&_h1]:mt-6 [&_h1]:mb-[23px] [&_h1]:text-[clamp(48px,5.4vw,78px)] [&_h1]:leading-[1.04] [&_h1]:font-[450] [&_h1]:tracking-[-3.7px] [&_h1>span]:text-[#d5e9a6] max-[1180px]:px-[38px] max-[1180px]:pt-[35px] max-[1180px]:pb-[25px] max-[1180px]:[&_h1]:text-[64px] max-[960px]:px-[30px] max-[960px]:[&_h1]:text-[58px] max-[900px]:hidden [@media(min-width:901px)_and_(max-height:800px)]:pt-[27px] [@media(min-width:901px)_and_(max-height:800px)]:pb-5 [@media(min-width:901px)_and_(max-height:800px)]:[&_h1]:my-[18px] [@media(min-width:901px)_and_(max-height:800px)]:[&_h1]:text-[50px] [@media(min-width:901px)_and_(max-height:800px)]:[&_h1]:tracking-[-2.6px]">
        <Brand light />
        <div className="login-story-content m-0 flex w-full max-w-[470px] flex-1 flex-col justify-center pt-[60px] pb-[25px] [&>p]:m-0 [&>p]:text-[15px] [&>p]:leading-[1.7] [&>p]:text-[#d3dec8] max-[1180px]:max-w-[400px] [@media(min-width:901px)_and_(max-height:800px)]:pt-6 [@media(min-width:901px)_and_(max-height:800px)]:pb-2.5">
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
          <div className="login-illustration relative mt-11 w-full max-w-[390px] pb-[23px] pl-2.5 max-[1180px]:max-w-[340px] max-[960px]:max-w-[290px] [@media(min-width:901px)_and_(max-height:800px)]:mt-[30px] [@media(min-width:901px)_and_(max-height:800px)]:h-[208px] [@media(min-width:901px)_and_(max-height:800px)]:origin-top-left [@media(min-width:901px)_and_(max-height:800px)]:scale-80" aria-hidden="true">
            <div className="illustration-orbit absolute -top-[25px] -right-[30px] size-80 rounded-full border border-[#9cbf7826]" />
            <div className="illustration-orbit absolute -top-[25px] -right-[30px] size-80 rounded-full border border-[#9cbf7826] orbit-two -top-[60px]! -right-[65px]! size-[390px]! border-dashed! border-[#9cbf7818]!" />
            <div className="illustration-card relative z-10 w-[280px] rotate-[-5deg] rounded-2xl bg-[#f6f8ee] px-[23px] pt-5 text-[#34523c] shadow-[0_20px_40px_#12382b50] [&>div:first-child]:flex [&>div:first-child]:items-center [&>div:first-child]:gap-2 [&>div:first-child]:text-[7px] [&>div:first-child]:tracking-[1px] [&>div:first-child]:text-[#81956b] [&>div:first-child>svg]:ml-auto [&>div:first-child>svg]:size-4 [&>strong]:mt-[13px] [&>strong]:block [&>strong]:text-[25px] [&>strong]:leading-[1.2] [&>strong]:font-medium [&>strong]:tracking-[-0.8px] max-[1180px]:w-[260px] max-[960px]:w-[235px]">
              <div>
                <span className="illustration-icon rounded-[7px] bg-[#e9efdc] p-1.5 [&_svg]:size-[15px]">
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
              <div className="illustration-bars mt-3 flex h-[77px] items-end gap-2.5 border-b border-[#e2e9d4] [&_span]:w-[23px] [&_span]:rounded-t [&_span]:bg-[#c1d393] [&_span:nth-child(2n)]:bg-[#e1e7cb] [&_span:last-child]:bg-[#799b5d]">
                {[30, 48, 39, 66, 57, 84, 100].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="illustration-caption flex items-center gap-[5px] py-3 text-[7px] text-[#92a17d] [&_.live-dot]:size-1">
                <span className="live-dot inline-block size-1.5 shrink-0 rounded-full bg-[#a2b87c]" />
                Seu futuro começa no presente.
              </div>
            </div>
            <div className="floating-note absolute right-0 bottom-[31px] z-30 flex rotate-[5deg] items-center gap-[9px] rounded-[10px] border border-[#e6f4c7] bg-[#d9eeac] px-[17px] py-3 text-[#516a36] shadow-[0_10px_20px_#142e2522] [&>span]:grid [&>span]:size-[27px] [&>span]:place-items-center [&>span]:rounded-full [&>span]:bg-[#c8de95] [&_svg]:size-3.5 [&>div]:text-[8px] [&_strong]:mt-1 [&_strong]:block [&_strong]:text-[10px] [&_strong]:font-semibold max-[960px]:-right-[5px] max-[960px]:px-3 max-[960px]:py-2.5">
              <span>
                <Icon name="check" />
              </span>
              <div>
                Pequenos hábitos.<strong>Grandes mudanças.</strong>
              </div>
            </div>
            <div className="coin absolute top-[25px] right-5 z-20 grid size-[51px] rotate-[20deg] place-items-center rounded-full border-4 border-[#b6cb7a] bg-[#d1e59a] text-[25px] font-medium text-[#8ea85c] shadow-[3px_3px_#8fa65c] max-[960px]:-right-2.5 coin-one">$</div>
            <div className="coin absolute top-[25px] right-5 z-20 grid size-[51px] rotate-[20deg] place-items-center rounded-full border-4 border-[#b6cb7a] bg-[#d1e59a] text-[25px] font-medium text-[#8ea85c] shadow-[3px_3px_#8fa65c] max-[960px]:-right-2.5 coin-two top-[77px]! right-0! size-[34px]! rotate-[-15deg]! border-[3px]! text-[17px]! max-[960px]:top-[90px]! max-[960px]:-right-[22px]!">$</div>
          </div>
        </div>
        <div className="login-story-footer relative z-20 mt-[25px] flex justify-between text-xs leading-[1.6] text-[#c4d4b7]">
          <span>Seu dinheiro, no seu ritmo.</span>
          <span>© 2026 Meu Trocado</span>
        </div>
      </section>
      <section className="login-form-side flex min-w-0 flex-col items-center justify-center gap-8 px-[clamp(24px,4vw,64px)] pt-12 pb-7 max-[900px]:min-h-svh max-[900px]:gap-7 max-[900px]:px-6 max-[900px]:py-7 max-[400px]:px-4 max-[400px]:py-6">
        <div className="login-mobile-brand hidden max-[900px]:block max-[900px]:w-full max-[900px]:max-w-[440px]">
          <Brand />
        </div>
        <div className="login-form-content m-auto grid w-full max-w-[440px] gap-7 rounded-[20px] border border-[#dfe5d6] bg-white p-8 [&_h2]:m-0 [&_h2]:text-[clamp(30px,3vw,38px)] [&_h2]:leading-[1.15] [&_h2]:font-[550] [&_h2]:tracking-[-1.2px] [&_h2]:text-balance [&_h2>span]:text-[#719252] max-[900px]:p-7 max-[400px]:gap-6 max-[400px]:px-5 max-[400px]:py-6 max-[400px]:[&_h2]:text-[30px]">
          <Suspense
            fallback={
              <>
                <LoginHeading />
                <div className="login-clerk min-h-60 w-full min-w-0 text-base">
                  <LoginFormLoading />
                </div>
              </>
            }
          >
            <LoginForm />
          </Suspense>
          <div className="login-trust flex flex-col items-center gap-2 border-t border-[#e2e8da] pt-6 text-center text-[#557e36] [&>svg]:mt-0.5 [&>svg]:shrink-0 [&_p]:m-0 [&_p]:text-sm [&_p]:leading-[1.6] [&_p]:text-[#526548] [&_p_span]:text-[length:inherit]">
            <Icon name="shield" width="20" height="20" aria-hidden="true" />
            <p>
              Seu espaço é só seu.
              <br />
              <span>Acesso seguro com e-mail e senha.</span>
            </p>
          </div>
        </div>
        <footer className="login-form-footer max-w-[440px] text-center text-[13px] leading-[1.6] text-[#5c6e51]">
          Organizar o hoje. Deixar o amanhã mais leve.
        </footer>
      </section>
    </main>
  );
}
