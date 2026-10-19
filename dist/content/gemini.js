var q=Object.defineProperty;var O=(a,t,r)=>t in a?q(a,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):a[t]=r;var P=(a,t,r)=>O(a,typeof t!="symbol"?t+"":t,r);const D={input:'rich-textarea div[contenteditable="true"], .ql-editor[contenteditable="true"], textarea[aria-label*="prompt" i], div[contenteditable="true"][role="textbox"], [contenteditable="true"]',sendButton:'button[aria-label*="Send" i], button[aria-label*="Submit" i], button.send-button, button.mat-mdc-icon-button[aria-label*="Send" i], .send-button-container button, form button[type="submit"]'};class f{static isGeminiPage(t=window.location.href){return t.includes("gemini.google.com")}static isReady(){var e;const t=document.querySelector("rich-textarea");return(((e=t==null?void 0:t.shadowRoot)==null?void 0:e.querySelector('[contenteditable="true"]'))||document.querySelector(D.input))!==null}static isGenerating(){return!!Array.from(document.querySelectorAll('button[aria-label*="Stop response" i], button[aria-label*="Stop generating" i], button.stop-button, [data-test-id="stop-button"]')).find(e=>{if(e.offsetParent===null&&e.offsetWidth===0&&e.offsetHeight===0)return!1;const n=window.getComputedStyle(e);return n.display!=="none"&&n.visibility!=="hidden"&&n.opacity!=="0"})}}function w(a){if(!a)return"";function t(e){var o,m,p;if(e.nodeType===Node.TEXT_NODE)return e.textContent||"";if(e.nodeType!==Node.ELEMENT_NODE)return"";const n=e,i=n.tagName.toLowerCase();if(n.classList.contains("sr-only")||n.getAttribute("aria-hidden")==="true")return"";switch(i){case"table":{const c=Array.from(n.querySelectorAll("tr"));if(c.length===0)return"";const s=[];let l=!1;return c.forEach((u,h)=>{const b=Array.from(u.querySelectorAll("th, td"));if(b.length===0)return;const E=h===0||u.querySelector("th")!==null,S="| "+b.map(v=>(v.textContent||"").trim().replace(/\n+/g," ")||"-").join(" | ")+" |";if(s.push(S),E&&!l){const v="| "+b.map(()=>"---").join(" | ")+" |";s.push(v),l=!0}}),`

`+s.join(`
`)+`

`}case"pre":{const c=n.querySelector("code"),s=((m=(o=c==null?void 0:c.className)==null?void 0:o.match(/language-(\w+)/))==null?void 0:m[1])||"",l=(c?c.textContent:n.textContent)||"";return`

\`\`\`${s}
${l.trim()}
\`\`\`

`}case"code":return((p=n.parentElement)==null?void 0:p.tagName.toLowerCase())==="pre"?n.textContent||"":`\`${n.textContent||""}\``;case"h1":return`

# ${r(n).trim()}

`;case"h2":return`

## ${r(n).trim()}

`;case"h3":return`

### ${r(n).trim()}

`;case"h4":case"h5":case"h6":return`

#### ${r(n).trim()}

`;case"ul":return`
`+Array.from(n.children).filter(s=>s.tagName.toLowerCase()==="li").map(s=>`- ${r(s).trim()}`).join(`
`)+`

`;case"ol":return`
`+Array.from(n.children).filter(s=>s.tagName.toLowerCase()==="li").map((s,l)=>`${l+1}. ${r(s).trim()}`).join(`
`)+`

`;case"li":return r(n);case"strong":case"b":return`**${r(n)}**`;case"em":case"i":return`*${r(n)}*`;case"p":return`

${r(n).trim()}

`;case"br":return`
`;case"blockquote":return`

> ${r(n).trim()}

`;default:return r(n)}}function r(e){let n="";for(const i of Array.from(e.childNodes))n+=t(i);return n}return t(a).replace(/\n{3,}/g,`

`).trim()}async function _(a,t){var i;try{const o=document.createElement("script");o.textContent=`
      try {
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.hasFocus = () => true;
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
      } catch (e) {}
    `,(document.head||document.documentElement).appendChild(o),o.remove()}catch{}try{window.dispatchEvent(new Event("focus")),document.dispatchEvent(new Event("focus"))}catch{}if(a.focus(),a.tagName.toLowerCase()==="textarea"){const o=(i=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value"))==null?void 0:i.set;o==null||o.call(a,t),a.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),a.dispatchEvent(new Event("change",{bubbles:!0,composed:!0}));return}try{const o=window.getSelection(),m=document.createRange();m.selectNodeContents(a),o==null||o.removeAllRanges(),o==null||o.addRange(m),document.execCommand("delete",!1),document.execCommand("insertText",!1,t)}catch{}try{const o=new DataTransfer;o.setData("text/plain",t);const m=new ClipboardEvent("paste",{clipboardData:o,bubbles:!0,cancelable:!0,composed:!0});a.dispatchEvent(m)}catch{}let r=a.querySelector("p");r||(r=document.createElement("p"),a.appendChild(r)),r.innerHTML=t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");const e=a.closest("rich-textarea")||document.querySelector("rich-textarea");if(e)try{e.value=t}catch{}const n={bubbles:!0,cancelable:!0,composed:!0,inputType:"insertText",data:t};try{a.dispatchEvent(new InputEvent("beforeinput",n)),a.dispatchEvent(new InputEvent("input",n))}catch{a.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))}r.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),e&&(e.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),e.dispatchEvent(new Event("change",{bubbles:!0,composed:!0})),e.dispatchEvent(new CustomEvent("input",{bubbles:!0,composed:!0,detail:{value:t}}))),a.dispatchEvent(new Event("change",{bubbles:!0,composed:!0}))}class M{constructor(){P(this,"id","gemini");P(this,"name","Gemini")}matches(t){return f.isGeminiPage(t)}async isReady(){return f.isReady()}async getStatus(){return f.isGeminiPage()?f.isGenerating()?"generating":f.isReady()?"ready":"unavailable":"unavailable"}async sendPrompt(t){var p,c;const r=document.querySelector("rich-textarea"),e=((p=r==null?void 0:r.shadowRoot)==null?void 0:p.querySelector('[contenteditable="true"]'))||document.querySelector(D.input);if(!e)throw new Error("Gemini input element not found");const i=Array.from(document.querySelectorAll("model-response")).length;await _(e,t),await new Promise(s=>setTimeout(s,250));const o=Date.now(),m=18e3;for(;Date.now()-o<m;){if(f.isGenerating()||document.querySelectorAll("model-response").length>i)return;let s=((c=r==null?void 0:r.shadowRoot)==null?void 0:c.querySelector('button[aria-label*="Send" i], button.send-button, .send-button-container button'))||document.querySelector(D.sendButton);if(s||(s=Array.from(document.querySelectorAll("button")).find(h=>{const b=(h.getAttribute("aria-label")||"").toLowerCase();return b.includes("send")||b.includes("submit")})||null),e.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),r&&r.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),s){s.removeAttribute("aria-disabled"),s.setAttribute("aria-disabled","false"),s.removeAttribute("disabled"),s.disabled=!1;const u={bubbles:!0,cancelable:!0,composed:!0,view:window};try{s.dispatchEvent(new PointerEvent("pointerdown",u)),s.dispatchEvent(new MouseEvent("mousedown",u)),s.dispatchEvent(new PointerEvent("pointerup",u)),s.dispatchEvent(new MouseEvent("mouseup",u))}catch{}s.click()}const l={key:"Enter",code:"Enter",keyCode:13,which:13,bubbles:!0,cancelable:!0,composed:!0};e.dispatchEvent(new KeyboardEvent("keydown",l)),e.dispatchEvent(new KeyboardEvent("keypress",l)),e.dispatchEvent(new KeyboardEvent("keyup",l)),await new Promise(u=>setTimeout(u,350))}}async waitForCompletion(t){const r=(t==null?void 0:t.timeoutMs)||12e4,e=(t==null?void 0:t.pollIntervalMs)||250,n=Date.now(),i=Array.from(document.querySelectorAll("model-response")),o=i.length,m=o>0?(w(i[o-1])||i[o-1].innerText||"").trim():"";let p="",c="",s=0,l=!1,u=null;return new Promise((h,b)=>{const E=()=>{const R=f.isGenerating(),T=Array.from(document.querySelectorAll("model-response"));let d="";if(T.length>0){const g=T[T.length-1];d=w(g)||(g.innerText||g.textContent||"").trim()}else{const g=document.querySelectorAll("message-content, div.model-response-text, div.response-container-content, .response-content");if(g.length>0){const C=g[g.length-1];d=w(C)||(C.innerText||C.textContent||"").trim()}}const A=T.length>o,x=d.length>20&&d!==m;(R||A||x)&&(l=!0),l&&d&&(A||x)&&d!==c&&(t!=null&&t.onProgress)&&(c=d,t.onProgress(d)),l&&(A||x)&&d.length>30&&!R&&(d===p?(s++,s>=6&&(S(),h())):(p=d,s=0)),Date.now()-n>r&&(S(),l&&(A||x)&&d.length>30?h():b(new Error("Gemini generation timed out")))},S=()=>{clearInterval(v),u&&(u.disconnect(),u=null)},v=setInterval(E,e);try{u=new MutationObserver(()=>{E()}),u.observe(document.body,{childList:!0,subtree:!0,characterData:!0})}catch{}})}async getLatestResponse(){const t=Array.from(document.querySelectorAll("model-response"));if(t.length>0){const e=t[t.length-1],n=w(e)||(e.innerText||e.textContent||"").trim();if(n.length>0)return{provider:"gemini",text:n,status:"completed",startedAt:Date.now()-5e3,completedAt:Date.now()}}const r=["message-content","div.model-response-text","div.response-container-content",".response-content"];for(const e of r){const n=document.querySelectorAll(e);if(n&&n.length>0){const i=n[n.length-1],o=w(i)||(i.innerText||i.textContent||"").trim();if(o.length>0)return{provider:"gemini",text:o,status:"completed",startedAt:Date.now()-5e3,completedAt:Date.now()}}}throw new Error("No assistant response found in Gemini DOM")}}const y=new M;chrome.runtime.onMessage.addListener((a,t,r)=>!("provider"in a)||a.provider!=="gemini"?!1:((async()=>{try{switch(a.type){case"CHECK_PROVIDER_STATUS":{const e=await y.getStatus();r({type:"PROVIDER_STATUS_RESPONSE",provider:"gemini",status:e});break}case"SUBMIT_PROMPT":{await y.sendPrompt(a.prompt),r({type:"PROMPT_SUBMITTED",provider:"gemini",success:!0});try{await y.waitForCompletion({timeoutMs:a.timeoutMs||12e4,onProgress:n=>{chrome.runtime.sendMessage({type:"PROVIDER_STREAM_UPDATE",provider:"gemini",text:n}).catch(()=>{})}});const e=await y.getLatestResponse();chrome.runtime.sendMessage({type:"PROVIDER_RESPONSE",provider:"gemini",response:e})}catch(e){chrome.runtime.sendMessage({type:"PROVIDER_ERROR",provider:"gemini",error:e.message||"Gemini failed during synthesis generation"})}break}case"GET_LATEST_RESPONSE":{const e=await y.getLatestResponse();r({type:"PROVIDER_RESPONSE",provider:"gemini",response:e});break}}}catch(e){r({type:"PROVIDER_ERROR",provider:"gemini",error:e.message})}})(),!0));
