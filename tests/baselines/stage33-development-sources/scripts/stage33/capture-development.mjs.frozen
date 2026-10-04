// Test-process-only hook; never imported by browser code. Records authored fixture inputs.
import {registerHooks} from 'node:module';
registerHooks({load(url,context,next){
 const result=next(url,context);
 if(url.endsWith('/lib/grammar.ts')) {
  const signature='export function analyzeSentence(input: string, inputVersion = 0): AnalysisResult {';
  if(!String(result.source).includes(signature))throw new Error('Development capture signature changed');
  result.source=String(result.source).replace(signature,signature+'\n__captureStage33(input);');
  result.source="import {appendFileSync as __captureAppend} from 'node:fs';\nfunction __captureStage33(input: string) { if(process.env.STAGE33_DEVELOPMENT_CAPTURE) __captureAppend(process.env.STAGE33_DEVELOPMENT_CAPTURE,JSON.stringify(input)+'\\n'); }\n"+result.source;
 }
 return result;
}});
