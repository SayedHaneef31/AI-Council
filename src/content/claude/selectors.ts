export const ClaudeSelectors = {
  // Input field - Claude uses div[contenteditable="true"] or textarea
  input: 'fieldset div[contenteditable="true"], div.ProseMirror[contenteditable="true"], textarea[placeholder*="Claude"]',
  // Send button
  sendButton: 'button[aria-label*="Send"], button[aria-label*="send"]',
  // Stop indicator
  stopButton: 'button[aria-label*="Stop"]',
  // Assistant response nodes
  assistantMessages: 'div.font-claude-message, div[data-is-streaming], div.grid-cols-1 div.prose',
  // Mid-chat question / questionnaire elements & choice buttons
  questionnaireContainer: '[data-testid*="questionnaire"], [data-testid*="choice"], div[role="radiogroup"], fieldset, form, div[class*="questionnaire"], div[class*="options-container"]',
  choiceButtons: 'button[data-testid*="option"], button[data-testid*="choice"], button.option-pill, div[role="radiogroup"] button, fieldset button, div[role="group"] button',
  radioInputs: 'input[type="radio"], [role="radio"]',
  radioLabels: 'label:has(input[type="radio"]), fieldset label, [role="radiogroup"] label',
  questionnaireSubmitButton: 'button[type="submit"], button[data-testid*="submit"], button[data-testid*="continue"], button[data-testid*="confirm"], form button[type="submit"]',
};
