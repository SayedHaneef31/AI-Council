var R=Object.defineProperty;var T=(a,r,t)=>r in a?R(a,r,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[r]=t;var v=(a,r,t)=>T(a,typeof r!="symbol"?r+"":r,t);const w={input:'rich-textarea div[contenteditable="true"], textarea[aria-label*="Enter a prompt"], div[contenteditable="true"][aria-label*="prompt"], [contenteditable="true"]',sendButton:'button[aria-label*="Send prompt"], button.send-button, button[aria-label*="Submit"], button[aria-label*="Send"]',stopButton:'button[aria-label*="Stop response"], button.stop-button, button[aria-label*="Stop"]'};class h{static isGeminiPage(r=window.location.href){return r.includes("gemini.google.com")}static isReady(){return document.querySelector(w.input)!==null}static isGenerating(){return document.querySelector(w.stopButton)!==null}}function S(a){if(!a)return"";function r(e){var o,u,d;if(e.nodeType===Node.TEXT_NODE)return e.textContent||"";if(e.nodeType!==Node.ELEMENT_NODE)return"";const n=e,s=n.tagName.toLowerCase();if(n.classList.contains("sr-only")||n.getAttribute("aria-hidden")==="true")return"";switch(s){case"table":{const c=Array.from(n.querySelectorAll("tr"));if(c.length===0)return"";const i=[];let m=!1;return c.forEach((E,y)=>{const b=Array.from(E.querySelectorAll("th, td"));if(b.length===0)return;const g=y===0||E.querySelector("th")!==null,l="| "+b.map(p=>(p.textContent||"").trim().replace(/\n+/g," ")||"-").join(" | ")+" |";if(i.push(l),g&&!m){const p="| "+b.map(()=>"---").join(" | ")+" |";i.push(p),m=!0}}),`

`+i.join(`
`)+`

`}case"pre":{const c=n.querySelector("code"),i=((u=(o=c==null?void 0:c.className)==null?void 0:o.match(/language-(\w+)/))==null?void 0:u[1])||"",m=(c?c.textContent:n.textContent)||"";return`

\`\`\`${i}
${m.trim()}
\`\`\`

`}case"code":return((d=n.parentElement)==null?void 0:d.tagName.toLowerCase())==="pre"?n.textContent||"":`\`${n.textContent||""}\``;case"h1":return`

# ${t(n).trim()}

`;case"h2":return`

## ${t(n).trim()}

`;case"h3":return`

### ${t(n).trim()}

`;case"h4":case"h5":case"h6":return`

#### ${t(n).trim()}

`;case"ul":return`
`+Array.from(n.children).filter(i=>i.tagName.toLowerCase()==="li").map(i=>`- ${t(i).trim()}`).join(`
`)+`

`;case"ol":return`
`+Array.from(n.children).filter(i=>i.tagName.toLowerCase()==="li").map((i,m)=>`${m+1}. ${t(i).trim()}`).join(`
`)+`

`;case"li":return t(n);case"strong":case"b":return`**${t(n)}**`;case"em":case"i":return`*${t(n)}*`;case"p":return`

${t(n).trim()}

`;case"br":return`
`;case"blockquote":return`

> ${t(n).trim()}

`;default:return t(n)}}function t(e){let n="";for(const s of Array.from(e.childNodes))n+=r(s);return n}return r(a).replace(/\n{3,}/g,`

`).trim()}async function P(a,r){var n;if(a.focus(),a.tagName.toLowerCase()==="textarea"){const s=(n=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value"))==null?void 0:n.set;s==null||s.call(a,r),a.dispatchEvent(new Event("input",{bubbles:!0})),a.dispatchEvent(new Event("change",{bubbles:!0}));return}let t=a.querySelector("p");t||(t=document.createElement("p"),a.innerHTML="",a.appendChild(t)),t.textContent=r;const e={bubbles:!0,cancelable:!0,composed:!0,inputType:"insertText",data:r};try{a.dispatchEvent(new InputEvent("beforeinput",e)),a.dispatchEvent(new InputEvent("input",e))}catch{a.dispatchEvent(new Event("input",{bubbles:!0}))}a.dispatchEvent(new Event("change",{bubbles:!0})),a.dispatchEvent(new KeyboardEvent("keyup",{key:"a",bubbles:!0}));try{const s=document.createRange();s.selectNodeContents(t),s.collapse(!1);const o=window.getSelection();o==null||o.removeAllRanges(),o==null||o.addRange(s)}catch{}}class A{constructor(){v(this,"id","gemini");v(this,"name","Gemini")}matches(r){return h.isGeminiPage(r)}async isReady(){return h.isReady()}async getStatus(){return h.isGeminiPage()?h.isGenerating()?"generating":h.isReady()?"ready":"unavailable":"unavailable"}async sendPrompt(r){const t=document.querySelector(w.input);if(!t)throw new Error("Gemini input element not found");await P(t,r);let e=null;for(let o=0;o<20;o++){if(await new Promise(u=>setTimeout(u,100)),e=document.querySelector(w.sendButton),e){const u=e.getAttribute("aria-disabled")==="true",d=e.hasAttribute("disabled");if(!u&&!d)break}t.dispatchEvent(new Event("input",{bubbles:!0}))}const n=(e==null?void 0:e.getAttribute("aria-disabled"))==="true",s=e==null?void 0:e.hasAttribute("disabled");if(e&&!n&&!s)e.dispatchEvent(new MouseEvent("mousedown",{bubbles:!0,cancelable:!0,composed:!0})),e.dispatchEvent(new MouseEvent("mouseup",{bubbles:!0,cancelable:!0,composed:!0})),e.click();else{const o=new KeyboardEvent("keydown",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:!0,cancelable:!0,composed:!0});t.dispatchEvent(o),e&&e.click()}}async waitForCompletion(r){const t=(r==null?void 0:r.timeoutMs)||12e4,e=(r==null?void 0:r.pollIntervalMs)||250,n=Date.now();let s="",o="",u=0,d=null;return new Promise((c,i)=>{const m=()=>{const b=h.isGenerating(),g=document.querySelectorAll('model-response, message-content, div.model-response-text, div.response-container-content, [data-test-id="model-response"], .response-content, .markdown');let l="";if(g&&g.length>0){const p=g[g.length-1];l=S(p)||(p.innerText||p.textContent||"").trim()}l&&l!==o&&(r!=null&&r.onProgress)&&(o=l,r.onProgress(l)),l.length>20&&!b&&(l===s?(u++,u>=4&&(E(),c())):(s=l,u=0)),Date.now()-n>t&&(E(),l.length>20?c():i(new Error("Gemini generation timed out")))},E=()=>{clearInterval(y),d&&(d.disconnect(),d=null)},y=setInterval(m,e);try{d=new MutationObserver(()=>{m()}),d.observe(document.body,{childList:!0,subtree:!0,characterData:!0})}catch{}})}async getLatestResponse(){const r=["model-response","message-content","div.model-response-text","div.response-container-content",'[data-test-id="model-response"]',".response-content",".markdown"];for(const t of r){const e=document.querySelectorAll(t);if(e&&e.length>0){const n=e[e.length-1],s=S(n)||(n.innerText||n.textContent||"").trim();if(s.length>0)return{provider:"gemini",text:s,status:"completed",startedAt:Date.now()-5e3,completedAt:Date.now()}}}throw new Error("No assistant response found in Gemini DOM")}}const f=new A;chrome.runtime.onMessage.addListener((a,r,t)=>!("provider"in a)||a.provider!=="gemini"?!1:((async()=>{try{switch(a.type){case"CHECK_PROVIDER_STATUS":{const e=await f.getStatus();t({type:"PROVIDER_STATUS_RESPONSE",provider:"gemini",status:e});break}case"SUBMIT_PROMPT":{await f.sendPrompt(a.prompt),t({type:"PROMPT_SUBMITTED",provider:"gemini",success:!0});try{await f.waitForCompletion({timeoutMs:a.timeoutMs||12e4,onProgress:n=>{chrome.runtime.sendMessage({type:"PROVIDER_STREAM_UPDATE",provider:"gemini",text:n}).catch(()=>{})}});const e=await f.getLatestResponse();chrome.runtime.sendMessage({type:"PROVIDER_RESPONSE",provider:"gemini",response:e})}catch(e){chrome.runtime.sendMessage({type:"PROVIDER_ERROR",provider:"gemini",error:e.message||"Gemini failed during synthesis generation"})}break}case"GET_LATEST_RESPONSE":{const e=await f.getLatestResponse();t({type:"PROVIDER_RESPONSE",provider:"gemini",response:e});break}}}catch(e){t({type:"PROVIDER_ERROR",provider:"gemini",error:e.message})}})(),!0));
