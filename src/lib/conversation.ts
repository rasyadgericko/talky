export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_TURNS = 5; // 5 turns = 10 messages (user + assistant each)

/**
 * In-memory conversation context manager.
 * Keeps the last MAX_TURNS exchanges for multi-turn AI context.
 * Resets when the app restarts (no persistence).
 */
export class ConversationManager {
  private messages: ConversationMessage[] = [];

  /** Add a user-assistant exchange */
  addTurn(userMessage: string, assistantResponse: string): void {
    this.messages.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantResponse }
    );

    // Cap at MAX_TURNS * 2 messages
    const maxMessages = MAX_TURNS * 2;
    if (this.messages.length > maxMessages) {
      this.messages = this.messages.slice(-maxMessages);
    }
  }

  /** Get conversation history for API calls */
  getHistory(): ConversationMessage[] {
    return [...this.messages];
  }

  /** Clear all conversation context */
  clear(): void {
    this.messages = [];
  }

  /** Check if there's any context */
  hasContext(): boolean {
    return this.messages.length > 0;
  }

  /** Get number of turns stored */
  get turnCount(): number {
    return Math.floor(this.messages.length / 2);
  }
}
