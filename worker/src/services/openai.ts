import { Env } from '../types';

export interface ExtractedReceiptData {
  amount: number;
  currency: 'GHS' | 'XOF';
  categoryId: string;
  categoryName: string;
  merchant: string;
  date: string;
  transactionReference: string;
  confidence: {
    amount: boolean;
    merchant: boolean;
    category: boolean;
    reference: boolean;
  };
  uncertainNote?: string;
}

export class OpenAIService {
  private monthlyLimitUsd: number;

  constructor(private env: Env) {
    this.monthlyLimitUsd = parseFloat(env.MONTHLY_AI_BUDGET_USD || '5.00');
  }

  // Story 4.3: Check & update token cost
  private async checkAndRecordCost(promptTokens: number, completionTokens: number): Promise<boolean> {
    const currentMonthKey = new Date().toISOString().substring(0, 7);
    // gpt-4o-mini pricing: ~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens
    const callCost = (promptTokens * 0.00000015) + (completionTokens * 0.00000060);

    const record = await this.env.DB.prepare(
      'SELECT tokensUsed, estimatedCostUsd FROM token_usage WHERE monthKey = ?'
    ).bind(currentMonthKey).first<{ tokensUsed: number; estimatedCostUsd: number }>();

    const currentCost = record?.estimatedCostUsd || 0;
    const currentTokens = record?.tokensUsed || 0;

    if (currentCost >= this.monthlyLimitUsd) {
      return false; // Cap reached!
    }

    const newCost = currentCost + callCost;
    const newTokens = currentTokens + promptTokens + completionTokens;

    await this.env.DB.prepare(`
      INSERT INTO token_usage (monthKey, tokensUsed, estimatedCostUsd, updatedAt)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(monthKey) DO UPDATE SET
        tokensUsed = ?,
        estimatedCostUsd = ?,
        updatedAt = datetime('now')
    `).bind(currentMonthKey, newTokens, newCost, newTokens, newCost).run();

    return true;
  }

  async isBudgetExceeded(): Promise<boolean> {
    const currentMonthKey = new Date().toISOString().substring(0, 7);
    const record = await this.env.DB.prepare(
      'SELECT estimatedCostUsd FROM token_usage WHERE monthKey = ?'
    ).bind(currentMonthKey).first<{ estimatedCostUsd: number }>();

    return (record?.estimatedCostUsd || 0) >= this.monthlyLimitUsd;
  }

  // Story 3.3: Vision Extraction Pipeline (gpt-4o-mini)
  async extractReceiptVision(imageBase64: string, mimeType: string): Promise<ExtractedReceiptData> {
    if (!this.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured on Worker');
    }

    const systemPrompt = `You are a financial document parser specialized in West African student receipts and mobile money screenshots (MTN MoMo, Telecel Cash, campus food stalls, bookstores in Ghana/Togo).
Extract:
- amount (float)
- currency ("GHS" or "XOF")
- categoryId (one of: "cat-food", "cat-transport", "cat-books", "cat-social", "cat-utilities", "cat-other")
- categoryName (string matching the categoryId)
- merchant (string)
- transactionReference (string from mobile money or receipt number, or empty string if not visible)
- confidence: object with boolean flags for amount, merchant, category, reference (false if handwritten, blurry, or guess)
Return ONLY valid JSON matching this structure.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract receipt data from this image in JSON format:' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Vision call failed: ${response.status}`);
    }

    const data: any = await response.json();
    const usage = data.usage || { prompt_tokens: 500, completion_tokens: 150 };
    await this.checkAndRecordCost(usage.prompt_tokens, usage.completion_tokens);

    const parsed = JSON.parse(data.choices[0].message.content);
    return {
      amount: parsed.amount || 0,
      currency: parsed.currency || 'GHS',
      categoryId: parsed.categoryId || 'cat-food',
      categoryName: parsed.categoryName || 'Food & Chop',
      merchant: parsed.merchant || 'Commerce Campus',
      date: new Date().toISOString(),
      transactionReference: parsed.transactionReference || '',
      confidence: parsed.confidence || { amount: true, merchant: true, category: true, reference: true }
    };
  }

  // Story 4.2: M. Pognon Chat with Aggregated Financial Context
  async chatWithPognon(userQuery: string, financialContext: string): Promise<string> {
    if (await this.isBudgetExceeded()) {
      return "M. Pognon a atteint sa limite d'énergie mensuelle ($5 budget guardrail). Il se repose jusqu'au 1er du mois prochain pour préserver votre facture !";
    }

    if (!this.env.OPENAI_API_KEY) {
      return "M. Pognon : Je vois tes chiffres. Chaque cedi économisé est un jour de sérénité pour tes examens. Garde le cap !";
    }

    const systemPrompt = `Tu es M. Pognon, le coach financier personnel impitoyable mais bienveillant d'un étudiant à Accra (Ghana) et Lomé (Togo).
Ta personnalité est un mélange d'entraîneur sportif intransigeant et de grand frère taquin.
Règles strictes :
- Sois tranchant, réaliste, percutant (max 3-4 phrases).
- Parle en GHS (cedis) ou XOF (CFA).
- Réfère-toi aux repères campus concrets (waakye, cafétéria, photocopies de cours, Trotro).
- Ne sois jamais complaisant avec les pulsions d'achats superflus.
- Contexte financier actuel de l'étudiant :
${financialContext}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.3,
        max_tokens: 220
      })
    });

    if (!response.ok) {
      return "M. Pognon a un bref trou de mémoire réseau. Mais rappelle-toi ma règle d'or : attends 48h avant tout achat non essentiel !";
    }

    const data: any = await response.json();
    const usage = data.usage || { prompt_tokens: 350, completion_tokens: 90 };
    await this.checkAndRecordCost(usage.prompt_tokens, usage.completion_tokens);

    return data.choices[0].message.content.trim();
  }
}
