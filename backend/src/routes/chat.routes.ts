import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { authMiddleware } from './sync.routes.js';

export const chatRouter = Router();

chatRouter.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message requis.' });
    }

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
                content: 'Tu es M. Pognon, le coach budgétaire étudiant impitoyable mais bienveillant de Student Savings. Ton but est de protéger le solde de l\'étudiant pour qu\'il termine le mois sans famine ni dette sur le campus. Sois direct, réaliste, percutant et propose toujours une solution concrète (ex: période de réflexion 48h, repas campus).'
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

    // 2. Local heuristic advice
    const query = message.toLowerCase();
    let reply = '';
    if (query.includes('sneaker') || query.includes('chaussure') || query.includes('buy') || query.includes('acheter')) {
      reply = 'Attention étudiant ! Acheter sur un coup de tête amputera tes repas de fin de mois. Mets cet article en réflexion 48h dans ta liste d\'envies. Si tu en as encore besoin dans deux jours, nous réévaluerons ton solde.';
    } else if (query.includes('manger') || query.includes('food') || query.includes('restaurant') || query.includes('faim')) {
      reply = 'La nourriture hors-campus est le piège n°1 des étudiants. Privilégie la cantine universitaire ou cuisine en colocation pour diviser ta facture par deux cette semaine.';
    } else {
      reply = 'Garde le cap ! Chaque cédi ou franc CFA que tu protèges aujourd\'hui t\'assure la tranquillité d\'esprit pendant tes examens. Que souhaites-tu auditer d\'autre dans ton budget ?';
    }

    return res.json({ reply });
  } catch (err: any) {
    console.error('[Chat Error]', err);
    return res.status(500).json({ error: err.message || 'Erreur lors du chat.' });
  }
});
