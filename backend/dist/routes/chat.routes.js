"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const express_1 = require("express");
const config_js_1 = require("../config.js");
const sync_routes_js_1 = require("./sync.routes.js");
exports.chatRouter = (0, express_1.Router)();
exports.chatRouter.post('/chat', sync_routes_js_1.authMiddleware, async (req, res) => {
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
        if (config_js_1.config.openaiApiKey) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config_js_1.config.openaiApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: `You are M. Pognon, the shrewd yet caring student financial coach in Student Savings. The student's name is ${studentName}, and their available balance is ${balance} ${currency}. Your mission is to protect their ledger so they finish the month or cycle without going broke or into campus debt. Reply in the same language as the student (French or English). Be direct, realistic, encouraging, and always propose tangible solutions (e.g. 48h hesitation period, campus dining hall meals, envelope adjustments).`
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
                    const data = await response.json();
                    const reply = data.choices?.[0]?.message?.content;
                    if (reply) {
                        return res.json({ reply });
                    }
                }
            }
            catch (e) {
                console.warn('[OpenAI Error, falling back to heuristics]', e);
            }
        }
        // 2. Local heuristic advice (Default English, French if explicitly queried in French)
        const query = message.toLowerCase();
        const isFrench = /[éèêàùçœîôû]|(^|\b)(bonjour|salut|manger|achat|acheter|chaussures?|combien|peux-je|puis-je|aidez-moi|aide-moi|pourquoi|merci)(\b|$)/i.test(message);
        let reply = '';
        if (query.includes('sneaker') || query.includes('shoes') || query.includes('buy') || query.includes('purchase') || query.includes('achat') || query.includes('acheter') || query.includes('basket')) {
            reply = isFrench
                ? `Attention ${studentName} ! Dépenser impulsivement pour des articles de mode ou gadgets va amputer ton budget de repas. Tu as actuellement ${balance} ${currency} de marge. Mets cet article en pause 48h dans tes achats réfléchis. Si tu en as encore besoin dans 2 jours, nous ferons le point.`
                : `Hold on, ${studentName}! Impulse spending on fashion or gadgets will cut into your essential meals. You currently have ${balance} ${currency} left. Place this item on a 48h cool-off in your hesitation list. If you still need it in two days, we will audit your balance.`;
        }
        else if (query.includes('eat') || query.includes('food') || query.includes('restaurant') || query.includes('hungry') || query.includes('manger') || query.includes('repas') || query.includes('nourriture') || query.includes('resto') || query.includes('faim')) {
            reply = isFrench
                ? `L'alimentation hors-campus est le piège numéro 1 pour un étudiant ! Privilégie la cantine du campus ou cuisine en groupe avec des colocataires pour réduire tes dépenses alimentaires de moitié cette semaine.`
                : `Off-campus dining is the #1 pitfall for university students! Stick to the campus dining hall or batch-cook with roommates to cut your food spending in half this week.`;
        }
        else if (query.includes('plan') || query.includes('finish') || query.includes('month') || query.includes('finir') || query.includes('mois') || query.includes('budget')) {
            reply = isFrench
                ? `Voici ton plan de route, ${studentName} : avec ${balance} ${currency} disponibles, supprime les sorties payantes superflues cette semaine et surveille chaque dépense de transport. Chaque économie te garantit la tranquillité d'esprit pendant les examens !`
                : `Here is your game plan, ${studentName}: with ${balance} ${currency} remaining, limit paid outings this week and watch every transport cost. Every cedi or CFA franc you protect today guarantees peace of mind during exams!`;
        }
        else {
            reply = isFrench
                ? `Garde le cap, ${studentName} ! Avec ${balance} ${currency} restants dans tes enveloppes, la régularité paie toujours. Quel aspect de ton budget ou quelle dépense veux-tu analyser ?`
                : `Stay the course, ${studentName}! Every cedi or CFA franc you protect today guarantees peace of mind during exams. What else in your campus budget would you like to review?`;
        }
        return res.json({ reply });
    }
    catch (err) {
        console.error('[Chat Error]', err);
        return res.status(500).json({ error: err.message || 'Error processing chat request.' });
    }
});
