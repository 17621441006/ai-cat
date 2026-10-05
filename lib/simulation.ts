import demo from './scm-demo.json';
export const invoices=demo.invoiceMatching.records;
export const inventory=demo.inventory.skus;
export const scenarios=demo.coding.scenarios;
export type Invoice=typeof invoices[number];
export function matchInvoice(r:Invoice,tolerance=0,approval=100000){const qtyRate=Math.abs(r.invoicedQty-r.receivedQty)/Math.max(r.receivedQty,1);const priceRate=Math.abs(r.invoiceUnitPrice-r.poUnitPrice)/Math.max(r.poUnitPrice,1);const exception=qtyRate>tolerance/100+1e-9||priceRate>tolerance/100+1e-9;return {qtyRate,priceRate,exception,approval:r.invoiceAmount>=approval,status:exception?'差异待处理':r.invoiceAmount>=approval?'大额待审批':'三单匹配',difference:r.invoiceAmount-r.receivedQty*r.poUnitPrice};}
export const money=(n:number)=>new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY',maximumFractionDigits:2}).format(n);
export function candidateDistribution(temperature:number,topP:number,grounded:boolean){const logits=grounded?[3,2.6,1.5,0.1]:[2.8,2.2,1.6,.7];let probs=temperature<=.01?[1,0,0,0]:logits.map(v=>Math.exp((v-3)/temperature));const sum=probs.reduce((a,b)=>a+b,0);probs=probs.map(p=>p/sum);let cumulative=0;const allowed=probs.map((p,i)=>{const keep=i===0||cumulative<topP;cumulative+=p;return keep?p:0});const total=allowed.reduce((a,b)=>a+b,0);return allowed.map(p=>p/total);}
