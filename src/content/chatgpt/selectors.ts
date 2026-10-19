export const ChatGPTSelectors = {
  // Input field - ChatGPT uses contenteditable #prompt-textarea or textarea
  input: '#prompt-textarea, [contenteditable="true"], textarea[placeholder*="Ask"], textarea',
  // Send button
  sendButton: 'button[data-testid="send-button"], button[data-testid="fruitjuice-send-button"], button[aria-label*="Send" i], button[aria-label*="send" i]',
  // Stop / Generating indicator
  stopButton: 'button[data-testid="stop-button"], button[data-testid="fruitjuice-stop-button"], button[aria-label*="Stop" i], button[aria-label*="stop" i], .result-streaming, [data-is-streaming="true"], div.streaming',
  // Assistant response nodes
  assistantMessages: '[data-message-author-role="assistant"], div.agent-turn, [data-testid^="conversation-turn"] [data-message-author-role="assistant"]',
  // Mid-chat question / questionnaire elements & choice buttons
  questionnaireContainer: '[data-testid*="questionnaire"], [data-testid*="choice"], div[role="radiogroup"], fieldset, form, div[class*="questionnaire"], div[class*="options-container"]',
  choiceButtons: 'button[data-testid*="option"], button[data-testid*="choice"], button.choice-button, div[role="radiogroup"] button, [data-testid*="pill"] button, fieldset button',
  radioInputs: 'input[type="radio"], [role="radio"]',
  radioLabels: 'label:has(input[type="radio"]), fieldset label, [role="radiogroup"] label',
  questionnaireSubmitButton: 'button[type="submit"], button[data-testid*="submit"], button[data-testid*="continue"], button[data-testid*="confirm"], form button[type="submit"]',
  // Main chat container
  chatContainer: 'main',
};

