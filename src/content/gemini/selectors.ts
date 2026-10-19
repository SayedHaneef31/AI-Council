export const GeminiSelectors = {
  // Input field - Gemini uses rich-textarea div[contenteditable="true"] or textarea
  input: 'rich-textarea div[contenteditable="true"], .ql-editor[contenteditable="true"], textarea[aria-label*="prompt" i], div[contenteditable="true"][role="textbox"], [contenteditable="true"]',
  // Send button
  sendButton: 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button.send-button, button.mat-mdc-icon-button[aria-label*="Send" i], .send-button-container button, form button[type="submit"]',
  // Generating indicator / stop button
  stopButton: 'button[aria-label*="Stop response" i], button[aria-label*="Stop generating" i], button.stop-button, [data-test-id="stop-button"]',
  // Assistant response nodes
  assistantMessages: 'model-response',
};


