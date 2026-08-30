export const GeminiSelectors = {
  // Input field - Gemini uses rich-textarea div[contenteditable="true"] or textarea
  input: 'rich-textarea div[contenteditable="true"], textarea[aria-label*="Enter a prompt"], div[contenteditable="true"][aria-label*="prompt"], [contenteditable="true"]',
  // Send button
  sendButton: 'button[aria-label*="Send prompt"], button.send-button, button[aria-label*="Submit"], button[aria-label*="Send"]',
  // Generating indicator / stop button
  stopButton: 'button[aria-label*="Stop response"], button.stop-button, button[aria-label*="Stop"]',
  // Assistant response nodes
  assistantMessages: 'model-response, message-content, div.model-response-text, div.response-container-content, [data-test-id="model-response"], .response-content',
};
