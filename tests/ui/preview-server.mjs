// Isolated UI test harness. These fixtures never use Clerk credentials or the database.
import { build } from "esbuild";
import { readFile, readdir } from "node:fs/promises";
import http from "node:http";

const chunkFiles = await readdir(".next/static/chunks");
const cssFiles = chunkFiles.filter((file) => file.endsWith(".css"));
if (!cssFiles.length) throw new Error("Run pnpm build before the UI checks.");
const css = (
  await Promise.all(
    cssFiles.map((file) => readFile(`.next/static/chunks/${file}`, "utf8")),
  )
).join("\n");

const storeModule = `
import {useSyncExternalStore} from 'react';
import {toCents,fromCents} from './src/lib/financial';
export const today='2026-10-25';
let signedOut=false;let accountBalance="4280.50";let accountVersion=2;
let preferences={currency:new URLSearchParams(location.search).get('currency')??'BRL',configured:!new URLSearchParams(location.search).has('unconfigured'),timeZone:'America/Sao_Paulo',locale:new URLSearchParams(location.search).get('locale')??'pt-BR',settingsVersion:0};
let recurrences=[{id:'00000000-0000-4000-8000-000000000001',description:'Assinatura de internet',amount:'99.90',category:'bills',frequency:'monthly',startsOn:'2026-10-25',nextDueOn:'2026-11-25',version:1,endedAt:null}];
let rows=Array.from({length:26},(_,i)=>({id:'fixture-'+i,type:i===1?'adjustment':i%3===0?'income':'expense',category:i===1?null:i%3===0?'salary':['food','housing','transport','leisure','other'][i%5],description:i===0?'Último registro demonstrativo':i===1?'Conferência de saldo':'Registro '+String(i+1),amount:i===1?'4000.00':i%3===0?'500.00':'25.50',day:'2026-10-'+String(24-Math.floor(i/2)).padStart(2,'0'),newBalance:i===1?'4000.00':null}));
let revision=0;const listeners=new Set();
export function emit(){revision++;for(const listener of listeners)listener()}
export function useFixture(){useSyncExternalStore((listener)=>{listeners.add(listener);return()=>listeners.delete(listener)},()=>revision);return {rows,signedOut,recurrences,preferences,accountBalance,accountVersion}}
export async function saveSettingsAction(input){await new Promise(resolve=>setTimeout(resolve,250));if(new URLSearchParams(location.search).has('settingsError'))return {success:false,message:'Não foi possível salvar. Tente novamente.'};if(input.currency!==preferences.currency&&preferences.currency){if(!input.confirmReset)return {success:false,message:'Confirme a exclusão.'};rows=[];recurrences=[];accountBalance="0.00";accountVersion++;}preferences={...preferences,...input,configured:true,settingsVersion:preferences.settingsVersion+1};emit();return {success:true,message:'Configurações salvas.'}}
export async function createTransactionAction(input){await new Promise(resolve=>setTimeout(resolve,600));if(input.repeat&&input.repeat!=='none'){recurrences=[...recurrences,{id:input.requestId,description:input.description,amount:input.amount,category:input.category,frequency:input.repeat,startsOn:input.occurredOn,nextDueOn:input.occurredOn,version:0,endedAt:null}]}if(input.occurredOn<=today){accountBalance=fromCents(toCents(accountBalance)+(input.type==='income'?toCents(input.amount):-toCents(input.amount)));accountVersion++;rows=[{id:input.requestId,type:input.type,category:input.category??'other',description:input.description,amount:input.amount,day:input.occurredOn,newBalance:null},...rows];}emit();return {success:true}}
export async function updateRecurrenceAction(input){await new Promise(resolve=>setTimeout(resolve,400));recurrences=recurrences.map(item=>item.id===input.id?{...item,...input,version:item.version+1}:item);emit();return {success:true}}
export async function endRecurrenceAction(input){await new Promise(resolve=>setTimeout(resolve,400));recurrences=recurrences.filter(item=>item.id!==input.id);emit();return {success:true}}
export async function adjustBalanceAction(input){await new Promise(resolve=>setTimeout(resolve,600));accountBalance=input.balance;accountVersion++;rows=[{id:input.requestId,type:'adjustment',description:input.reason,amount:'0.00',day:today,newBalance:input.balance},...rows];emit();return {success:true}}
export function useClerk(){return {async signOut(){signedOut=true;emit()},openUserProfile(){}}}
export function usePathname(){useSyncExternalStore((listener)=>{listeners.add(listener);return()=>listeners.delete(listener)},()=>revision);return location.pathname}
export function useRouter(){return {push(url){const delay=Number(new URLSearchParams(location.search).get('navigationDelay')??0);const commit=()=>{history.pushState({},'',url);emit()};if(delay)return new Promise(resolve=>setTimeout(()=>{commit();resolve()},delay));commit()},refresh(){emit()}}}
`;
const entry = `
import React from 'react';import {createRoot} from 'react-dom/client';
import {AppShell} from './src/app/(private)/_components/app-shell';
import {Dashboard} from './src/app/(private)/_components/dashboard';
import {HistoryScreen} from './src/app/(private)/transactions/_components/history-screen';
import {RecurrencesScreen} from './src/app/(private)/recurrences/_components/recurrences-screen';
import {PageSkeleton} from './src/app/(private)/_components/data-skeleton';
import Loader from './src/app/_components/shared/loader';
import {Toaster} from './src/app/_components/ui/toast';
import {PwaProvider} from './src/app/_components/pwa/pwa-provider';
import {UnavailableState} from './src/app/_components/shared/unavailable-state';
import {useFixture,today} from 'preview-store';
import {PreferencesProvider} from './src/app/(private)/_components/preferences-context';
import {SettingsForm} from './src/app/(private)/settings/_components/settings-form';
function App(){const {rows,signedOut,recurrences,preferences,accountBalance,accountVersion}=useFixture();if(signedOut)return <main><h1>Sessão encerrada</h1></main>;if(location.pathname==='/loader')return <Loader/>;
const params=new URLSearchParams(location.search);const month=params.get('month')??'2026-10';const page=Number(params.get('page')??1);const type=params.get('type')??'all';const query=params.get('q')??'';const category=params.get('category')??'all';
const filtered=rows.filter(row=>row.day.startsWith(month)&&(type==='all'||type===row.type)&&(category==='all'||category===row.category)&&row.description.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
const data={balance:accountBalance,version:accountVersion,account:{balance:accountBalance,version:accountVersion,...preferences},income:'6500.00',expense:'2219.50',count:rows.length,lastActivity:rows[0],chart:[{month:'2026-05',income:'4200.00',expense:'2700.00'},{month:'2026-06',income:'4800.00',expense:'3400.00'},{month:'2026-07',income:'4400.00',expense:'2900.00'},{month:'2026-08',income:'5300.00',expense:'3500.00'},{month:'2026-09',income:'5100.00',expense:'3900.00'},{month:'2026-10',income:'6500.00',expense:'2219.50'}]};
data.categories=[{category:'housing',amount:'1200.00'},{category:'food',amount:'600.00'},{category:'transport',amount:'250.00'},{category:'leisure',amount:'100.00'},{category:'other',amount:'69.50'}];
data.previousExpense='1969.50';
data.topExpenses=[{id:'top-1',description:'Aluguel',amount:'1200.00',category:'housing',day:today},{id:'top-2',description:'Mercado',amount:'350.00',category:'food',day:today},{id:'top-3',description:'Restaurante',amount:'250.00',category:'food',day:today},{id:'top-4',description:'Transporte',amount:'150.00',category:'transport',day:today},{id:'top-5',description:'Cinema',amount:'100.00',category:'leisure',day:today}];
if(params.has('single')){Object.assign(data,{income:'0.00',expense:'123.00',previousExpense:'0.00',categories:[{category:'other',amount:'123.00'}],topExpenses:[{id:'single',description:'Compra do mês',amount:'123.00',category:'other',day:today}],chart:[{month:'2026-10',income:'0.00',expense:'123.00'}]})}
if(params.has('empty')){Object.assign(data,{income:'0.00',expense:'0.00',previousExpense:'0.00',categories:[],topExpenses:[],lastActivity:null,count:0,chart:[]})}
if(params.has('error'))return <AppShell name='Gustavo' email='example@example.test'><UnavailableState title={location.pathname==='/transactions'?'Não foi possível carregar o histórico':'Não foi possível carregar seu resumo'} retry={()=>{history.replaceState({},'',location.pathname);location.reload()}}/></AppShell>;
return <Toaster timeout={3500}><PreferencesProvider preferences={preferences}><AppShell name='Gustavo' email='um.email.demonstrativo.com.nome.muito.grande@example.test'>{!preferences.configured?<SettingsForm mandatory/>:location.pathname==='/settings'?<SettingsForm key={preferences.settingsVersion}/>:location.pathname==='/recurrences'?<RecurrencesScreen recurrences={recurrences} account={data.account} today={today}/>:location.pathname==='/transactions'?(params.has('loading')?<PageSkeleton history/>:<HistoryScreen data={{total:filtered.length,activity:filtered.slice((page-1)*20,page*20),account:data.account}} filters={{month,type,category,query,page}} today={today}/>):<Dashboard data={data} name='Gustavo' today={today} month={month}/>}</AppShell></PreferencesProvider></Toaster>}
createRoot(document.getElementById('root')).render(<PwaProvider><App/></PwaProvider>);
`;
const compiled = await build({
  stdin: { contents: entry, loader: "tsx", resolveDir: process.cwd() },
  bundle: true,
  write: false,
  outdir: "preview",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "test-fixtures",
      setup(builder) {
        builder.onResolve(
          {
            filter:
              /^preview-store$|^@clerk\/nextjs$|^next\/navigation$|^next\/link$|_actions\/(create-transaction|adjust-balance|manage-recurrence|save-settings)$/,
          },
          (args) => ({
            path: args.path === "next/link" ? "link" : "store",
            namespace: "fixture",
          }),
        );
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          contents:
            args.path === "link"
              ? `import React from 'react';import {useRouter} from 'preview-store';export default function Link({children,href,onClick,...props}){const router=useRouter();return React.createElement('a',{...props,href,onClick(event){onClick?.(event);if(!event.defaultPrevented&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey){event.preventDefault();router.push(href)}}},children)}`
              : storeModule,
          loader: "js",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const javascriptBundle = compiled.outputFiles.find((file) =>
  file.path.endsWith(".js"),
).text;
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meu Trocado — interface com dados fictícios</title><link rel="stylesheet" href="/preview.css"><style>:root{--font-geist-sans:Arial,Helvetica,sans-serif}</style></head><body><div id="root"></div><script src="/preview.js"></script></body></html>`;
http
  .createServer((req, res) => {
    const javascript = req.url === "/preview.js",
      stylesheet = req.url === "/preview.css";
    res.writeHead(200, {
      "content-type": javascript
        ? "application/javascript"
        : stylesheet
          ? "text/css"
          : "text/html; charset=utf-8",
    });
    res.end(javascript ? javascriptBundle : stylesheet ? css : html);
  })
  .listen(3179, "127.0.0.1", () =>
    console.log("Isolated UI fixtures at http://127.0.0.1:3179"),
  );
