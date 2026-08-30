export const ChatGPTSelectors = {
  // Input field - ChatGPT uses contenteditable or textarea with #prompt-textarea
  input: '#prompt-textarea, textarea[placeholder*="Ask"], [contenteditable="true"]',
  // Send button
  sendButton: 'button[data-testid="send-button"], button[aria-label*="Send"]',
  // Stop / Generating indicator
  stopButton: 'button[data-testid="stop-button"], button[aria-label*="Stop"]',
  // Assistant response nodes
  assistantMessages: '[data-message-author-role="assistant"], div.agent-turn, div[aria-label*="ChatGPT"]',
  // Main chat container
  chatContainer: 'main',
};
