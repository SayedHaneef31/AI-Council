function f(e,s,u){const t=u.map(n=>`=== ${n.provider.toUpperCase()} RESPONSE ===
${n.text}`).join(`

`);return`You are acting as the AI Council Orchestrator and Synthesizer.
Your task is to cross-examine and synthesize answers from the participating AI models into ONE clear, transparent decision recommendation.

ORIGINAL USER QUESTION:
${e}

${s?`ADDITIONAL USER CONTEXT:
${s}
`:""}
${t}

IMPORTANT FORMAT REQUIREMENT:
Your response MUST use the exact markdown headers below (with ##):

## VERDICT
[Provide the single concise recommendation or conclusion here.]

## CONSENSUS
- [Key point of agreement 1]
- [Key point of agreement 2]

## DISAGREEMENT
- [Key disagreement or divergence in priority/reasoning 1]

## WHY
- [Reason 1 supporting the recommendation]
- [Reason 2 supporting the recommendation]

## CONFIDENCE
[Confidence percentage e.g. 85%, with a brief 1-line justification]
`}function E(e){const s={verdict:"",consensus:[],disagreements:[],why:[],confidence:void 0,rawMarkdown:e};if(!e)return s;const u=/(?:^|\n)(?:#{1,4}\s*|\*{2}\s*\d?\.?\s*|\d\.\s*)(VERDICT|CONSENSUS|DISAGREEMENT|WHY|CONFIDENCE)[\s:*]*/gi,t=Array.from(e.matchAll(u));if(t.length>0)for(let n=0;n<t.length;n++){const r=t[n],l=r[1].toUpperCase(),d=r.index+r[0].length,o=n+1<t.length?t[n+1].index:e.length,i=e.slice(d,o).trim(),a=i.split(`
`).map(p=>p.trim().replace(/^(?:[-*•]|\d+[.)])\s*/,"")).filter(p=>p.length>0);l.includes("VERDICT")?s.verdict=i.replace(/^[\s:*]+/,"").trim():l.includes("CONSENSUS")?s.consensus=a:l.includes("DISAGREEMENT")?s.disagreements=a:l.includes("WHY")?s.why=a:l.includes("CONFIDENCE")&&(s.confidence=a.join(" "))}return s.verdict||(s.verdict=e.trim()),s}let c=null;chrome.runtime.onInstalled.addListener(()=>{chrome.sidePanel&&typeof chrome.sidePanel.setPanelBehavior=="function"&&chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0}).catch(e=>{console.error("Failed to set side panel behavior:",e)})});chrome.sidePanel&&typeof chrome.sidePanel.setPanelBehavior=="function"&&chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0}).catch(()=>{});async function T(e){const s=await chrome.tabs.query({url:e});return s.length>0?s[0]:null}async function g(e,s){try{return await new Promise(t=>{chrome.tabs.sendMessage(e,{type:"CHECK_PROVIDER_STATUS",provider:s},n=>{chrome.runtime.lastError||!n?t(!1):t(!0)})})||(console.log(`[AI Council] Content script missing on ${s} tab (${e}). Injecting dynamically...`),await chrome.scripting.executeScript({target:{tabId:e},files:[`content/${s}.js`]}),await new Promise(t=>setTimeout(t,300))),!0}catch(u){return console.error(`Failed to ensure content script on ${s}:`,u),!1}}async function h(){const e=["chatgpt","claude","gemini"],s={chatgpt:"https://chatgpt.com/*",claude:"https://claude.ai/*",gemini:"https://gemini.google.com/*"},u={chatgpt:{status:"unavailable"},claude:{status:"unavailable"},gemini:{status:"unavailable"}};for(const t of e){const n=await T(s[t]);n&&n.id&&(await g(n.id,t),u[t]={status:"ready",tabId:n.id})}return u}async function m(e,s,u,t=9e4){return await g(s,e),new Promise((n,r)=>{const l=setTimeout(()=>{r(new Error(`${e} timed out after ${t/1e3}s`))},t);chrome.tabs.sendMessage(s,{type:"SUBMIT_PROMPT",provider:e,prompt:u,timeoutMs:t},o=>{if(chrome.runtime.lastError){clearTimeout(l),r(new Error(`Failed to contact ${e} tab: ${chrome.runtime.lastError.message}`));return}o&&o.type==="PROVIDER_ERROR"&&(clearTimeout(l),r(new Error(o.error)))});const d=o=>{"provider"in o&&o.provider===e&&(o.type==="PROVIDER_RESPONSE"?(clearTimeout(l),chrome.runtime.onMessage.removeListener(d),n(o.response)):o.type==="PROVIDER_ERROR"&&(clearTimeout(l),chrome.runtime.onMessage.removeListener(d),r(new Error(o.error))))};chrome.runtime.onMessage.addListener(d)})}chrome.runtime.onMessage.addListener((e,s,u)=>{if(e.type==="CHECK_PROVIDER_STATUS")return h().then(t=>{u({type:"PROVIDER_STATUS_RESPONSE",statuses:t})}),!0;if(e.type==="START_COUNCIL_RUN")return(async()=>{const{prompt:t,context:n}=e;c={prompt:t,context:n,responses:{},errors:{}};const r=await h();chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"running",providers:{chatgpt:{status:r.chatgpt.tabId?"sending":"unavailable"},claude:{status:r.claude.tabId?"sending":"unavailable"},gemini:{status:r.gemini.tabId?"ready":"unavailable"}}}});const l=[];r.chatgpt.tabId&&l.push(m("chatgpt",r.chatgpt.tabId,t).then(i=>({provider:"chatgpt",response:i})).catch(i=>({provider:"chatgpt",error:i.message}))),r.claude.tabId&&l.push(m("claude",r.claude.tabId,t).then(i=>({provider:"claude",response:i})).catch(i=>({provider:"claude",error:i.message})));const d=await Promise.allSettled(l),o=[];if(d.forEach(i=>{if(i.status==="fulfilled"){const a=i.value;a.response?(c.responses[a.provider]=a.response,o.push(a.response)):a.error&&(c.errors[a.provider]=a.error)}}),o.length===0){chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"failed",error:"No model responses were successfully retrieved from ChatGPT or Claude."}});return}if(chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"synthesizing",providers:{chatgpt:{status:c.responses.chatgpt?"completed":"failed",error:c.errors.chatgpt,response:c.responses.chatgpt},claude:{status:c.responses.claude?"completed":"failed",error:c.errors.claude,response:c.responses.claude},gemini:{status:"sending"}}}}),r.gemini.tabId)try{const i=f(t,n||"",o),a=await m("gemini",r.gemini.tabId,i,12e4);c.responses.gemini=a;const p=E(a.text);chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"completed",synthesis:p,providers:{chatgpt:{status:c.responses.chatgpt?"completed":"failed",error:c.errors.chatgpt,response:c.responses.chatgpt},claude:{status:c.responses.claude?"completed":"failed",error:c.errors.claude,response:c.responses.claude},gemini:{status:"completed",response:a}}}})}catch(i){chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"failed",error:`Gemini synthesis failed: ${i.message}`}})}else chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"failed",error:"Gemini tab is not open or available for synthesis."}})})(),!0});
