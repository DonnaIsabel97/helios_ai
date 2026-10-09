import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../../../ml/finsage/usd_model.py", import.meta.url));
const python = process.env.PYTHON_PATH || (process.env.NODE_ENV === "production" ? "python" : fileURLToPath(new URL("../../../.venv/Scripts/python.exe", import.meta.url)));

// No shell interpolation; bound inference time and output size, and fail without saving on error.
export function runCreditScenario(inputs) {
 return new Promise((resolve,reject) => {
  const child = execFile(python,[script],{timeout:30000,maxBuffer:512*1024,windowsHide:true,env:{...process.env,PYTHONUTF8:"1"}},(error,stdout) => {
   let result;
   try {result=JSON.parse(stdout);} catch {return reject(Object.assign(new Error("FinSage could not return a prediction. Please try again."),{status:503}));}
   if(error || result.error || !Number.isFinite(result.risk_probability) || result.risk_probability<0 || result.risk_probability>1 || result.model_version!=="finsage_usd_v3") {
    return reject(Object.assign(new Error("FinSage inference failed. No simulation was saved."),{status:503}));
   }
   resolve(result);
  });
  child.stdin.on("error",()=>{});
  child.stdin.end(JSON.stringify(inputs));
 });
}
