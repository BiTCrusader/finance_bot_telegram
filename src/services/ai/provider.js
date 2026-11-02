/**
 * Abstract AI Provider interface.
 * All AI providers must implement these methods.
 */
export class AIProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Parse natural language input into a structured transaction.
   * @param {string} text - User's message
   * @returns {Promise<{type: 'INCOME'|'EXPENSE', amount: bigint|null, category: string, description: string, date: string|null, confidence: number}>}
   * Returns null if text is not a transaction.
   */
  async parseTransaction(text) {
    throw new Error('Not implemented');
  }

  /**
   * Parse natural language for initial balance setting.
   * @param {string} text
   * @returns {Promise<{amount: bigint|null, isBalanceSetting: boolean}>}
   */
  async parseBalanceSetting(text) {
    throw new Error('Not implemented');
  }

  /**
   * Generate financial analysis/summary based on user data.
   * @param {string} question - User's question
   * @param {object} financialData - User's financial data from DB
   * @returns {Promise<string>} AI response text
   */
  async generateAnalysis(question, financialData) {
    throw new Error('Not implemented');
  }

  /**
   * Process receipt image for OCR.
   * @param {Buffer} imageBuffer
   * @returns {Promise<{storeName: string|null, date: string|null, total: bigint|null, items: Array<{name: string, price: bigint}>}>}
   */
  async processReceipt(imageBuffer) {
    throw new Error('Not implemented');
  }

  /**
   * Determine user intent from message.
   * @param {string} text
   * @returns {Promise<{intent: string, data: object}>}
   * Possible intents: 'transaction', 'balance_check', 'balance_setting', 'report', 'savings', 'reminder', 'analysis', 'greeting', 'help', 'unknown'
   */
  async detectIntent(text) {
    throw new Error('Not implemented');
  }
}
