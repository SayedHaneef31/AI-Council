export const ChatGPTSelectors = {
  // Input field - ChatGPT uses contenteditable #prompt-textarea or textarea
  input: '#prompt-textarea, [contenteditable="true"], textarea[placeholder*="Ask"], textarea',
  // Send button
  sendButton: 'button[data-testid="send-button"], button[data-testid="fruitjuice-send-button"], button[aria-label*="Send"], button[aria-label*="send"]',
  // Stop / Generating indicator
  stopButton: 'button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="stop"]',
  // Assistant response nodes
  assistantMessages: '[data-message-author-role="assistant"], div.agent-turn, [data-testid^="conversation-turn"] [data-message-author-role="assistant"]',
  // Main chat container
  chatContainer: 'main',
};
