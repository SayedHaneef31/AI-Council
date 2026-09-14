var C=Object.defineProperty;var R=(a,e,r)=>e in a?C(a,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):a[e]=r;var b=(a,e,r)=>R(a,typeof e!="symbol"?e+"":e,r);const w={input:'#prompt-textarea, [contenteditable="true"], textarea[placeholder*="Ask"], textarea',sendButton:'button[data-testid="send-button"], button[data-testid="fruitjuice-send-button"], button[aria-label*="Send"], button[aria-label*="send"]',stopButton:'button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="stop"]'};class h{static isChatGPTPage(e=window.location.href){return e.includes("chatgpt.com")||e.includes("chat.openai.com")}static isReady(){const e=document.querySelector(w.input);return e!==null&&!e.disabled}static isGenerating(){return document.querySelector(w.stopButton)!==null}}function y(a){if(!a)return"";function e(n){var p,m,g;if(n.nodeType===Node.TEXT_NODE)return n.textContent||"";if(n.nodeType!==Node.ELEMENT_NODE)return"";const t=n,c=t.tagName.toLowerCase();if(t.classList.contains("sr-only")||t.getAttribute("aria-hidden")==="true")return"";switch(c){case"table":{const o=Array.from(t.querySelectorAll("tr"));if(o.length===0)return"";const s=[];let l=!1;return o.forEach((u,i)=>{const d=Array.from(u.querySelectorAll("th, td"));if(d.length===0)return;const E=i===0||u.querySelector("th")!==null,P="| "+d.map(T=>(T.textContent||"").trim().replace(/\n+/g," ")||"-").join(" | ")+" |";if(s.push(P),E&&!l){const T="| "+d.map(()=>"---").join(" | ")+" |";s.push(T),l=!0}}),`

`+s.join(`
`)+`

`}case"pre":{const o=t.querySelector("code"),s=((m=(p=o==null?void 0:o.className)==null?void 0:p.match(/language-(\w+)/))==null?void 0:m[1])||"",l=(o?o.textContent:t.textContent)||"";return`

\`\`\`${s}
${l.trim()}
\`\`\`

`}case"code":return((g=t.parentElement)==null?void 0:g.tagName.toLowerCase())==="pre"?t.textContent||"":`\`${t.textContent||""}\``;case"h1":return`

# ${r(t).trim()}

`;case"h2":return`

## ${r(t).trim()}

`;case"h3":return`

### ${r(t).trim()}

`;case"h4":case"h5":case"h6":return`

#### ${r(t).trim()}

`;case"ul":return`
`+Array.from(t.children).filter(s=>s.tagName.toLowerCase()==="li").map(s=>`- ${r(s).trim()}`).join(`
`)+`

`;case"ol":return`
`+Array.from(t.children).filter(s=>s.tagName.toLowerCase()==="li").map((s,l)=>`${l+1}. ${r(s).trim()}`).join(`
`)+`

`;case"li":return r(t);case"strong":case"b":return`**${r(t)}**`;case"em":case"i":return`*${r(t)}*`;case"p":return`

${r(t).trim()}

`;case"br":return`
`;case"blockquote":return`

> ${r(t).trim()}

`;default:return r(t)}}function r(n){let t="";for(const c of Array.from(n.childNodes))t+=e(c);return t}return e(a).replace(/\n{3,}/g,`

`).trim()}async function S(a,e){var n;a.focus();try{const t=new DataTransfer;t.setData("text/plain",e);const c=new ClipboardEvent("paste",{clipboardData:t,bubbles:!0,cancelable:!0});a.dispatchEvent(c)}catch{}await new Promise(t=>setTimeout(t,150));const r=a.tagName.toLowerCase()==="textarea"?a.value:a.innerText||a.textContent||"";if(!r||r.trim().length<e.trim().length*.5){if(a.tagName.toLowerCase()==="textarea"){const t=(n=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value"))==null?void 0:n.set;t==null||t.call(a,e)}else a.innerText=e;a.dispatchEvent(new Event("input",{bubbles:!0})),a.dispatchEvent(new Event("change",{bubbles:!0}))}}class v{constructor(){b(this,"id","chatgpt");b(this,"name","ChatGPT")}matches(e){return h.isChatGPTPage(e)}async isReady(){return h.isReady()}async getStatus(){return h.isChatGPTPage()?h.isGenerating()?"generating":h.isReady()?"ready":"unavailable":"unavailable"}async sendPrompt(e){const r=document.querySelector(w.input);if(!r)throw new Error("ChatGPT input element not found");await S(r,e),await new Promise(t=>setTimeout(t,350));const n=document.querySelector(w.sendButton);if(n&&!n.disabled)n.click();else{const t=new KeyboardEvent("keydown",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:!0,cancelable:!0});r.dispatchEvent(t)}}async waitForCompletion(e){const r=(e==null?void 0:e.timeoutMs)||9e4,n=(e==null?void 0:e.pollIntervalMs)||250,t=Date.now();let c="",p="",m=0;return new Promise((g,o)=>{const s=setInterval(()=>{const l=h.isGenerating(),u=document.querySelectorAll('[data-message-author-role="assistant"], div.agent-turn, main .markdown');let i="";if(u&&u.length>0){const d=u[u.length-1];i=y(d)||(d.innerText||d.textContent||"").trim()}if(i&&i!==p&&(e!=null&&e.onProgress)&&(p=i,e.onProgress(i)),i.length>10&&!l)if(i===c){if(m++,m>=4){clearInterval(s),g();return}}else c=i,m=0;Date.now()-t>r&&(clearInterval(s),i.length>10?g():o(new Error("ChatGPT generation timed out")))},n)})}async getLatestResponse(){const e=['[data-message-author-role="assistant"]',"div.agent-turn","main .markdown"];for(const r of e){const n=document.querySelectorAll(r);if(n&&n.length>0){const t=n[n.length-1],c=y(t)||(t.innerText||t.textContent||"").trim();if(c.length>0)return{provider:"chatgpt",text:c,status:"completed",startedAt:Date.now()-5e3,completedAt:Date.now()}}}throw new Error("No assistant response found in ChatGPT DOM")}}const f=new v;chrome.runtime.onMessage.addListener((a,e,r)=>!("provider"in a)||a.provider!=="chatgpt"?!1:((async()=>{try{switch(a.type){case"CHECK_PROVIDER_STATUS":{const n=await f.getStatus();r({type:"PROVIDER_STATUS_RESPONSE",provider:"chatgpt",status:n});break}case"SUBMIT_PROMPT":{await f.sendPrompt(a.prompt),r({type:"PROMPT_SUBMITTED",provider:"chatgpt",success:!0});try{await f.waitForCompletion({timeoutMs:a.timeoutMs||9e4,onProgress:t=>{chrome.runtime.sendMessage({type:"PROVIDER_STREAM_UPDATE",provider:"chatgpt",text:t}).catch(()=>{})}});const n=await f.getLatestResponse();chrome.runtime.sendMessage({type:"PROVIDER_RESPONSE",provider:"chatgpt",response:n})}catch(n){chrome.runtime.sendMessage({type:"PROVIDER_ERROR",provider:"chatgpt",error:n.message||"ChatGPT failed during generation"})}break}case"GET_LATEST_RESPONSE":{const n=await f.getLatestResponse();r({type:"PROVIDER_RESPONSE",provider:"chatgpt",response:n});break}}}catch(n){r({type:"PROVIDER_ERROR",provider:"chatgpt",error:n.message})}})(),!0));
