import { PredictionInputError } from './prediction-input-error.js';
type Forecast={weekStart:string;weekEnd:string;priceSolesPerKg:string;lowerSolesPerKg:string;upperSolesPerKg:string};
export type ObservedPrice={priceSolesPerKg:string;weightKg:string;operationCount:number};
function date(value:string){const time=Date.parse(`${value}T00:00:00Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw new PredictionInputError('Fecha comercial inválida.');return time;}
function price(value:string){if(!/^\d+\.\d{4}$/.test(value))throw new PredictionInputError('Precio registrado inválido.');return BigInt(value.replace('.',''));}
function format(value:bigint){return `${value/10000n}.${String(value%10000n).padStart(4,'0')}`;}
export function comparePublicationOutcome(forecast:Forecast,asOf:string,actual:ObservedPrice|null){
  const start=date(forecast.weekStart);const end=date(forecast.weekEnd);const current=date(asOf);
  if(new Date(start).getUTCDay()!==1||end-start!==6*86400000)throw new PredictionInputError('La publicación requiere una semana comercial completa.');
  const predicted=price(forecast.priceSolesPerKg),lower=price(forecast.lowerSolesPerKg),upper=price(forecast.upperSolesPerKg);
  if(lower>predicted||predicted>upper)throw new PredictionInputError('El rango publicado no contiene su estimación.');
  if(current<=end)return {state:'week_in_progress' as const,actualSolesPerKg:null,absoluteErrorSolesPerKg:null,covered:null};
  if(!actual)return {state:'no_valid_operations' as const,actualSolesPerKg:null,absoluteErrorSolesPerKg:null,covered:null};
  if(!Number.isSafeInteger(actual.operationCount)||actual.operationCount<1||!/^\d+\.\d{3}$/.test(actual.weightKg)||BigInt(actual.weightKg.replace('.',''))<=0n)throw new PredictionInputError('El valor real requiere ventas válidas y peso positivo.');
  const real=price(actual.priceSolesPerKg);const difference=real-predicted;
  return {state:'compared' as const,actualSolesPerKg:format(real),absoluteErrorSolesPerKg:format(difference<0n?-difference:difference),covered:real>=lower&&real<=upper,operationCount:actual.operationCount,weightKg:actual.weightKg};
}
