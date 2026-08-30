export const ClaudeSelectors = {
  // Input field - Claude uses div[contenteditable="true"] or textarea
  input: 'fieldset div[contenteditable="true"], div.ProseMirror[contenteditable="true"], textarea[placeholder*="Claude"]',
  // Send button
  sendButton: 'button[aria-label*="Send"], button[aria-label*="send"]',
  // Stop indicator
  stopButton: 'button[aria-label*="Stop"]',
  // Assistant response nodes
  assistantMessages: 'div.font-claude-message, div[data-is-streaming], div.grid-cols-1 div.prose',
};
