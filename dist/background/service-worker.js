function g(t,s,d){const r=d.map(o=>`=== ${o.provider.toUpperCase()} RESPONSE ===
${o.text}`).join(`

`);return`You are acting as the AI Council Orchestrator and Synthesizer.
Your goal is to cross-examine and synthesize answers from multiple AI models into ONE clear, transparent recommendation.

ORIGINAL USER QUESTION:
${t}

${s?`ADDITIONAL USER CONTEXT:
${s}
`:""}
${r}

TASK & FORMAT INSTRUCTIONS:
Analyze the model responses above. Produce a response adhering strictly to the following sections:

## VERDICT
[Provide the single concise recommendation or conclusion here.]

## CONSENSUS
- [Key point 1 of agreement across models]
- [Key point 2 of agreement across models]

## DISAGREEMENT
- [Key disagreement or divergence in priority/reasoning]

## WHY
- [Reason 1 supporting the recommendation]
- [Reason 2 supporting the recommendation]

## CONFIDENCE
[Confidence percentage e.g. 85%, with a brief 1-line justification]
`}function f(t){const s={verdict:"",consensus:[],disagreements:[],why:[],confidence:void 0,rawMarkdown:t},d=t.split(/^##\s+/m);for(const r of d){const o=r.trim().split(`
`);if(o.length===0)continue;const e=o[0].trim().toUpperCase(),i=o.slice(1).map(a=>a.trim()).filter(a=>a.length>0);e.includes("VERDICT")?s.verdict=i.join(" "):e.includes("CONSENSUS")?s.consensus=i.map(a=>a.replace(/^[-*•]\s*/,"")):e.includes("DISAGREEMENT")?s.disagreements=i.map(a=>a.replace(/^[-*•]\s*/,"")):e.includes("WHY")?s.why=i.map(a=>a.replace(/^[-*•]\s*/,"")):e.includes("CONFIDENCE")&&(s.confidence=i.join(" "))}return!s.verdict&&t&&(s.verdict=t.slice(0,300)+"..."),s}let n=null;async function E(t){const s=await chrome.tabs.query({url:t});return s.length>0?s[0]:null}async function m(){const t=["chatgpt","claude","gemini"],s={chatgpt:"https://chatgpt.com/*",claude:"https://claude.ai/*",gemini:"https://gemini.google.com/*"},d={chatgpt:{status:"unavailable"},claude:{status:"unavailable"},gemini:{status:"unavailable"}};for(const r of t){const o=await E(s[r]);o&&o.id&&(d[r]={status:"ready",tabId:o.id})}return d}async function p(t,s,d,r=9e4){return new Promise((o,e)=>{const i=setTimeout(()=>{e(new Error(`${t} timed out after ${r/1e3}s`))},r);chrome.tabs.sendMessage(s,{type:"SUBMIT_PROMPT",provider:t,prompt:d,timeoutMs:r},c=>{if(chrome.runtime.lastError){clearTimeout(i),e(new Error(`Failed to contact ${t} tab: ${chrome.runtime.lastError.message}`));return}c&&c.type==="PROVIDER_ERROR"&&(clearTimeout(i),e(new Error(c.error)))});const a=c=>{"provider"in c&&c.provider===t&&(c.type==="PROVIDER_RESPONSE"?(clearTimeout(i),chrome.runtime.onMessage.removeListener(a),o(c.response)):c.type==="PROVIDER_ERROR"&&(clearTimeout(i),chrome.runtime.onMessage.removeListener(a),e(new Error(c.error))))};chrome.runtime.onMessage.addListener(a)})}chrome.runtime.onMessage.addListener((t,s,d)=>{if(t.type==="CHECK_PROVIDER_STATUS")return m().then(r=>{d({type:"PROVIDER_STATUS_RESPONSE",statuses:r})}),!0;if(t.type==="START_COUNCIL_RUN")return(async()=>{const{prompt:r,context:o}=t;n={prompt:r,context:o,responses:{},errors:{}};const e=await m();chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"running",providers:{chatgpt:{status:e.chatgpt.tabId?"sending":"unavailable"},claude:{status:e.claude.tabId?"sending":"unavailable"},gemini:{status:e.gemini.tabId?"ready":"unavailable"}}}});const i=[];e.chatgpt.tabId&&i.push(p("chatgpt",e.chatgpt.tabId,r).then(l=>({provider:"chatgpt",response:l})).catch(l=>({provider:"chatgpt",error:l.message}))),e.claude.tabId&&i.push(p("claude",e.claude.tabId,r).then(l=>({provider:"claude",response:l})).catch(l=>({provider:"claude",error:l.message})));const a=await Promise.allSettled(i),c=[];if(a.forEach(l=>{if(l.status==="fulfilled"){const u=l.value;u.response?(n.responses[u.provider]=u.response,c.push(u.response)):u.error&&(n.errors[u.provider]=u.error)}}),c.length===0){chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"failed",error:"No model responses were successfully retrieved from ChatGPT or Claude."}});return}if(chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"synthesizing",providers:{chatgpt:{status:n.responses.chatgpt?"completed":"failed",error:n.errors.chatgpt,response:n.responses.chatgpt},claude:{status:n.responses.claude?"completed":"failed",error:n.errors.claude,response:n.responses.claude},gemini:{status:"sending"}}}}),e.gemini.tabId)try{const l=g(r,o||"",c),u=await p("gemini",e.gemini.tabId,l,12e4);n.responses.gemini=u;const h=f(u.text);chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"completed",synthesis:h,providers:{chatgpt:{status:n.responses.chatgpt?"completed":"failed",error:n.errors.chatgpt,response:n.responses.chatgpt},claude:{status:n.responses.claude?"completed":"failed",error:n.errors.claude,response:n.responses.claude},gemini:{status:"completed",response:u}}}})}catch(l){chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"failed",error:`Gemini synthesis failed: ${l.message}`}})}else chrome.runtime.sendMessage({type:"COUNCIL_STATE_UPDATE",state:{runStatus:"failed",error:"Gemini tab is not open or available for synthesis."}})})(),!0});
