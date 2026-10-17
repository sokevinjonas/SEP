import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { authMiddleware } from './sync.routes.js';

export const chatRouter = Router();

chatRouter.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const studentName = context?.studentName || 'Student';
    const balance = context?.balance !== undefined && context?.balance !== null
      ? Number(context.balance).toFixed(2)
      : '600.00';
    const currency = context?.currency || 'GHS';

    // 1. If OpenAI API key is set, call OpenAI
    if (config.openaiApiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are M. Pognon, the shrewd yet caring student financial coach in Student Savings (Campus Financial Guard). The student's name is ${studentName}, and their available balance is ${balance} ${currency}. Your mission is to protect their ledger so they finish the month or cycle without going broke or into campus debt. Reply strictly in ENGLISH at all times (user-facing UI and coach advice invariant). Never use Unicode emojis. Be direct, realistic, encouraging, and always propose tangible solutions (e.g. 48h hesitation period, campus cafeteria meals, envelope adjustments).`
              },
              {
                role: 'user',
                content: message
              }
            ],
            temperature: 0.7,
            max_tokens: 300
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return res.json({ reply });
          }
        }
      } catch (e) {
        console.warn('[OpenAI Error, falling back to heuristics]', e);
      }
    }

    // 2. Local heuristic advice (Strict English ONLY per AGENTS.md Invariant #2, ZERO emojis)
    const query = message.toLowerCase();
    let reply = '';

    if (query.includes('sneaker') || query.includes('shoes') || query.includes('buy') || query.includes('purchase') || query.includes('achat') || query.includes('acheter') || query.includes('basket')) {
      reply = `Hold on, ${studentName}! Impulse spending on fashion or luxury gadgets will cut directly into your cafeteria meals. You currently have ${balance} ${currency} left. Place this item on a 48-hour cool-off in your hesitation list. If you still need it in two days, we will audit your balance.`;
    } else if (query.includes('eat') || query.includes('food') || query.includes('restaurant') || query.includes('hungry') || query.includes('manger') || query.includes('repas') || query.includes('nourriture') || query.includes('resto') || query.includes('faim') || query.includes('chop') || query.includes('waakye')) {
      reply = `Off-campus dining is the #1 pitfall for university students! Stick to the campus dining hall or batch-cook with roommates to cut your food spending in half this week.`;
    } else if (query.includes('plan') || query.includes('finish') || query.includes('month') || query.includes('finir') || query.includes('mois') || query.includes('budget')) {
      reply = `Here is your game plan, ${studentName}: with ${balance} ${currency} remaining, limit paid outings this week and watch every transport cost. Every cedi or CFA franc you protect today guarantees peace of mind during exams!`;
    } else {
      reply = `Stay the course, ${studentName}! With ${balance} ${currency} remaining in your ledger, consistent tracking always wins. What aspect of your campus budget would you like to review?`;
    }

    return res.json({ reply });
  } catch (err: any) {
    console.error('[Chat Error]', err);
    return res.status(500).json({ error: err.message || 'Error processing chat request.' });
  }
});
