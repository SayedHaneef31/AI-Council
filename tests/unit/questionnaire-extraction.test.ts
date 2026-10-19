// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { ChatGPTAdapter, extractChoicesFromNode } from '../../src/content/chatgpt/adapter';
import { ClaudeAdapter } from '../../src/content/claude/adapter';

describe('Questionnaire and Radio Button Extraction', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('ChatGPT Adapter Radio & Questionnaire', () => {
    it('should extract radio button options from fieldset with labels', () => {
      const container = document.createElement('div');
      container.className = 'agent-turn';
      container.setAttribute('data-message-author-role', 'assistant');

      container.innerHTML = `
        <div class="markdown">
          <p>Before proceeding, please choose an implementation stack:</p>
        </div>
        <fieldset>
          <legend>Select Framework</legend>
          <label>
            <input type="radio" name="framework" value="nextjs" /> Next.js (SSR & App Router)
          </label>
          <label>
            <input type="radio" name="framework" value="vite" /> Vite + React SPA
          </label>
          <label>
            <input type="radio" name="framework" value="astro" /> Astro
          </label>
          <button type="submit" data-testid="submit-choice">Continue</button>
        </fieldset>
      `;
      document.body.appendChild(container);

      const choices = extractChoicesFromNode(container);
      expect(choices).toHaveLength(3);
      expect(choices[0]).toContain('Next.js (SSR & App Router)');
      expect(choices[1]).toContain('Vite + React SPA');
      expect(choices[2]).toContain('Astro');
    });

    it('should extract options with separate label[for] references', () => {
      const container = document.createElement('div');
      container.className = 'agent-turn';
      container.innerHTML = `
        <div role="radiogroup">
          <p>Which database tier?</p>
          <div>
            <input type="radio" id="opt-pg" name="db" />
            <label for="opt-pg">PostgreSQL</label>
          </div>
          <div>
            <input type="radio" id="opt-mysql" name="db" />
            <label for="opt-mysql">MySQL</label>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      const choices = extractChoicesFromNode(container);
      expect(choices).toEqual(['PostgreSQL', 'MySQL']);
    });

    it('should select radio input and trigger submit button when answering question', async () => {
      const adapter = new ChatGPTAdapter();
      const container = document.createElement('div');
      container.setAttribute('data-message-author-role', 'assistant');

      let radioChangeFired = false;
      let submitClicked = false;

      container.innerHTML = `
        <div class="markdown"><p>Select preference:</p></div>
        <fieldset>
          <label id="lbl-1">
            <input type="radio" id="radio-1" name="pref" value="OptA" /> Option A
          </label>
          <label id="lbl-2">
            <input type="radio" id="radio-2" name="pref" value="OptB" /> Option B
          </label>
          <button type="submit" id="sub-btn">Submit Choice</button>
        </fieldset>
      `;
      document.body.appendChild(container);

      const radioB = document.getElementById('radio-2') as HTMLInputElement;
      radioB.addEventListener('change', () => {
        radioChangeFired = true;
      });

      const submitBtn = document.getElementById('sub-btn') as HTMLButtonElement;
      submitBtn.addEventListener('click', () => {
        submitClicked = true;
      });

      // Answer with optionIndex 1 (Option B)
      await adapter.answerQuestion('Option B', 1);

      expect(radioB.checked).toBe(true);
      expect(radioChangeFired).toBe(true);
      expect(submitClicked).toBe(true);
    });

    it('should extract options and submit choice from modern ChatGPT Radix UI questionnaire', async () => {
      const adapter = new ChatGPTAdapter();
      const container = document.createElement('div');
      container.setAttribute('data-testid', 'conversation-turn-4');
      container.className = 'group/conversation-turn';

      let option3Clicked = false;
      let submitClicked = false;

      container.innerHTML = `
        <div class="agent-turn">
          <div data-message-author-role="assistant">
            <div class="markdown">
              <p>Best colourway: White / Silver Metallic / Navy</p>
              <p>One exception: If you walk or stand for long hours...</p>
            </div>
            <div class="questionnaire-block">
              <p>One question before you buy</p>
              <p>What's your biggest priority?</p>
              <div role="radiogroup">
                <div>
                  <button role="radio" data-state="unchecked" aria-checked="false" id="rad-1"></button>
                  <label for="rad-1">Maximum comfort for long walks and all-day wear</label>
                </div>
                <div>
                  <button role="radio" data-state="unchecked" aria-checked="false" id="rad-2"></button>
                  <label for="rad-2">Style and versatility with different outfits</label>
                </div>
                <div>
                  <button role="radio" data-state="unchecked" aria-checked="false" id="rad-3"></button>
                  <label for="rad-3">Equal balance of comfort and style</label>
                </div>
              </div>
              <button id="final-choice-btn">Help me make the final choice &rarr;</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      const rad3 = document.getElementById('rad-3') as HTMLButtonElement;
      rad3.addEventListener('click', () => {
        option3Clicked = true;
      });

      const choiceBtn = document.getElementById('final-choice-btn') as HTMLButtonElement;
      choiceBtn.addEventListener('click', () => {
        submitClicked = true;
      });

      const choices = extractChoicesFromNode(container);
      expect(choices).toHaveLength(3);
      expect(choices[0]).toContain('Maximum comfort');
      expect(choices[1]).toContain('Style and versatility');
      expect(choices[2]).toContain('Equal balance of comfort and style');

      // Answer with option 2 ("Equal balance of comfort and style")
      await adapter.answerQuestion('Equal balance of comfort and style', 2);

      expect(option3Clicked).toBe(true);
      expect(submitClicked).toBe(true);
    });
  });

  describe('Claude Adapter Radio & Questionnaire', () => {
    it('should select radio button when Claude presents options', async () => {
      const adapter = new ClaudeAdapter();
      const container = document.createElement('div');
      container.className = 'font-claude-message';

      let radioChangeFired = false;
      container.innerHTML = `
        <div class="prose"><p>Which styling approach would you prefer?</p></div>
        <div role="radiogroup">
          <label>
            <input type="radio" id="c-opt1" name="style" value="tailwind" /> Tailwind CSS
          </label>
          <label>
            <input type="radio" id="c-opt2" name="style" value="vanilla" /> Vanilla CSS
          </label>
        </div>
      `;
      document.body.appendChild(container);

      const radioVanilla = document.getElementById('c-opt2') as HTMLInputElement;
      radioVanilla.addEventListener('change', () => {
        radioChangeFired = true;
      });

      await adapter.answerQuestion('Vanilla CSS', 1);

      expect(radioVanilla.checked).toBe(true);
      expect(radioChangeFired).toBe(true);
    });
  });
});
