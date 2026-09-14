var v=Object.defineProperty;var R=(a,t,r)=>t in a?v(a,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):a[t]=r;var E=(a,t,r)=>R(a,typeof t!="symbol"?t+"":t,r);const w={input:'fieldset div[contenteditable="true"], div.ProseMirror[contenteditable="true"], textarea[placeholder*="Claude"]',sendButton:'button[aria-label*="Send"], button[aria-label*="send"]',stopButton:'button[aria-label*="Stop"]'};class f{static isClaudePage(t=window.location.href){return t.includes("claude.ai")}static isReady(){return document.querySelector(w.input)!==null}static isGenerating(){return document.querySelector(w.stopButton)!==null}}function b(a){if(!a)return"";function t(n){var g,m,p;if(n.nodeType===Node.TEXT_NODE)return n.textContent||"";if(n.nodeType!==Node.ELEMENT_NODE)return"";const e=n,c=e.tagName.toLowerCase();if(e.classList.contains("sr-only")||e.getAttribute("aria-hidden")==="true")return"";switch(c){case"table":{const o=Array.from(e.querySelectorAll("tr"));if(o.length===0)return"";const s=[];let i=!1;return o.forEach((u,l)=>{const d=Array.from(u.querySelectorAll("th, td"));if(d.length===0)return;const T=l===0||u.querySelector("th")!==null,C="| "+d.map(y=>(y.textContent||"").trim().replace(/\n+/g," ")||"-").join(" | ")+" |";if(s.push(C),T&&!i){const y="| "+d.map(()=>"---").join(" | ")+" |";s.push(y),i=!0}}),`

`+s.join(`
`)+`

`}case"pre":{const o=e.querySelector("code"),s=((m=(g=o==null?void 0:o.className)==null?void 0:g.match(/language-(\w+)/))==null?void 0:m[1])||"",i=(o?o.textContent:e.textContent)||"";return`

\`\`\`${s}
${i.trim()}
\`\`\`

`}case"code":return((p=e.parentElement)==null?void 0:p.tagName.toLowerCase())==="pre"?e.textContent||"":`\`${e.textContent||""}\``;case"h1":return`

# ${r(e).trim()}

`;case"h2":return`

## ${r(e).trim()}

`;case"h3":return`

### ${r(e).trim()}

`;case"h4":case"h5":case"h6":return`

#### ${r(e).trim()}

`;case"ul":return`
`+Array.from(e.children).filter(s=>s.tagName.toLowerCase()==="li").map(s=>`- ${r(s).trim()}`).join(`
`)+`

`;case"ol":return`
`+Array.from(e.children).filter(s=>s.tagName.toLowerCase()==="li").map((s,i)=>`${i+1}. ${r(s).trim()}`).join(`
`)+`

`;case"li":return r(e);case"strong":case"b":return`**${r(e)}**`;case"em":case"i":return`*${r(e)}*`;case"p":return`

${r(e).trim()}

`;case"br":return`
`;case"blockquote":return`

> ${r(e).trim()}

`;default:return r(e)}}function r(n){let e="";for(const c of Array.from(n.childNodes))e+=t(c);return e}return t(a).replace(/\n{3,}/g,`

`).trim()}async function S(a,t){var n;a.focus();try{const e=new DataTransfer;e.setData("text/plain",t);const c=new ClipboardEvent("paste",{clipboardData:e,bubbles:!0,cancelable:!0});a.dispatchEvent(c)}catch{}await new Promise(e=>setTimeout(e,150));const r=a.tagName.toLowerCase()==="textarea"?a.value:a.innerText||a.textContent||"";if(!r||r.trim().length<t.trim().length*.5){if(a.tagName.toLowerCase()==="textarea"){const e=(n=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value"))==null?void 0:n.set;e==null||e.call(a,t)}else a.innerText=t;a.dispatchEvent(new Event("input",{bubbles:!0})),a.dispatchEvent(new Event("change",{bubbles:!0}))}}class P{constructor(){E(this,"id","claude");E(this,"name","Claude")}matches(t){return f.isClaudePage(t)}async isReady(){return f.isReady()}async getStatus(){return f.isClaudePage()?f.isGenerating()?"generating":f.isReady()?"ready":"unavailable":"unavailable"}async sendPrompt(t){const r=document.querySelector(w.input);if(!r)throw new Error("Claude input element not found");await S(r,t),await new Promise(e=>setTimeout(e,350));const n=document.querySelector(w.sendButton);if(n&&!n.disabled)n.click();else{const e=new KeyboardEvent("keydown",{key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:!0,cancelable:!0});r.dispatchEvent(e)}}async waitForCompletion(t){const r=(t==null?void 0:t.timeoutMs)||9e4,n=(t==null?void 0:t.pollIntervalMs)||250,e=Date.now();let c="",g="",m=0;return new Promise((p,o)=>{const s=setInterval(()=>{const i=f.isGenerating(),u=document.querySelectorAll('div.font-claude-message, div.prose, [data-is-streaming="false"]');let l="";if(u&&u.length>0){const d=u[u.length-1];l=b(d)||(d.innerText||d.textContent||"").trim()}if(l&&l!==g&&(t!=null&&t.onProgress)&&(g=l,t.onProgress(l)),l.length>10&&!i)if(l===c){if(m++,m>=4){clearInterval(s),p();return}}else c=l,m=0;Date.now()-e>r&&(clearInterval(s),l.length>10?p():o(new Error("Claude generation timed out")))},n)})}async getLatestResponse(){const t=["div.font-claude-message","div.prose",'[data-is-streaming="false"]'];for(const r of t){const n=document.querySelectorAll(r);if(n&&n.length>0){const e=n[n.length-1],c=b(e)||(e.innerText||e.textContent||"").trim();if(c.length>0)return{provider:"claude",text:c,status:"completed",startedAt:Date.now()-5e3,completedAt:Date.now()}}}throw new Error("No assistant response found in Claude DOM")}}const h=new P;chrome.runtime.onMessage.addListener((a,t,r)=>!("provider"in a)||a.provider!=="claude"?!1:((async()=>{try{switch(a.type){case"CHECK_PROVIDER_STATUS":{const n=await h.getStatus();r({type:"PROVIDER_STATUS_RESPONSE",provider:"claude",status:n});break}case"SUBMIT_PROMPT":{await h.sendPrompt(a.prompt),r({type:"PROMPT_SUBMITTED",provider:"claude",success:!0});try{await h.waitForCompletion({timeoutMs:a.timeoutMs||9e4,onProgress:e=>{chrome.runtime.sendMessage({type:"PROVIDER_STREAM_UPDATE",provider:"claude",text:e}).catch(()=>{})}});const n=await h.getLatestResponse();chrome.runtime.sendMessage({type:"PROVIDER_RESPONSE",provider:"claude",response:n})}catch(n){chrome.runtime.sendMessage({type:"PROVIDER_ERROR",provider:"claude",error:n.message||"Claude failed during generation"})}break}case"GET_LATEST_RESPONSE":{const n=await h.getLatestResponse();r({type:"PROVIDER_RESPONSE",provider:"claude",response:n});break}}}catch(n){r({type:"PROVIDER_ERROR",provider:"claude",error:n.message})}})(),!0));
