export const GeminiSelectors = {
  // Input field - Gemini uses rich-textarea div[contenteditable="true"] or textarea
  input: 'rich-textarea div[contenteditable="true"], textarea[aria-label*="Enter a prompt"], div[contenteditable="true"][aria-label*="prompt"]',
  // Send button
  sendButton: 'button[aria-label*="Send prompt"], button.send-button, button[aria-label*="Submit"]',
  // Generating indicator / stop button
  stopButton: 'button[aria-label*="Stop response"], button.stop-button',
  // Assistant response nodes
  assistantMessages: 'message-content, div.model-response-text, div.response-container-content',
};
