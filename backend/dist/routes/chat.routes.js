"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const express_1 = require("express");
const config_js_1 = require("../config.js");
const sync_routes_js_1 = require("./sync.routes.js");
exports.chatRouter = (0, express_1.Router)();
exports.chatRouter.post('/chat', sync_routes_js_1.authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required.' });
        }
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
                                content: 'You are M. Pognon, the shrewd yet caring student financial coach in Student Savings. Your mission is to protect the student ledger so they finish the month or cycle without going broke or into campus debt. Be direct, realistic, encouraging, and always propose tangible solutions (e.g. 48h hesitation period, campus dining hall meals, envelope adjustments).'
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
        // 2. Local heuristic advice
        const query = message.toLowerCase();
        let reply = '';
        if (query.includes('sneaker') || query.includes('shoes') || query.includes('buy') || query.includes('purchase')) {
            reply = 'Hold on, student! Impulse spending on gadgets or fashion will cut into your essential meals. Place this item on a 48h cool-off in your hesitation list. If you still need it in two days, we will audit your balance.';
        }
        else if (query.includes('eat') || query.includes('food') || query.includes('restaurant') || query.includes('hungry')) {
            reply = 'Off-campus dining is the #1 pitfall for university students. Stick to the campus dining hall or batch-cook with roommates to cut your food spending in half this week.';
        }
        else {
            reply = 'Stay the course! Every cedi or CFA franc you protect today guarantees peace of mind during exams. What else in your campus budget would you like to review?';
        }
        return res.json({ reply });
    }
    catch (err) {
        console.error('[Chat Error]', err);
        return res.status(500).json({ error: err.message || 'Error processing chat request.' });
    }
});
