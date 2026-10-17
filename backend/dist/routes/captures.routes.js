"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.capturesRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const config_js_1 = require("../config.js");
const sync_routes_js_1 = require("./sync.routes.js");
const resend_1 = require("resend");
exports.capturesRouter = (0, express_1.Router)();
// In-memory file storage for instant analysis
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
const resend = config_js_1.config.resendApiKey ? new resend_1.Resend(config_js_1.config.resendApiKey) : null;
async function extractWithGPT4o(buffer, mimeType, fileName) {
    if (!config_js_1.config.openaiApiKey) {
        throw new Error('OpenAI API key not configured. Please define OPENAI_API_KEY in backend/.env.');
    }
    console.log(`[GPT-4o Vision] Analyzing receipt image: ${fileName} (${Math.round(buffer.length / 1024)} KB) with OpenAI GPT-4o...`);
    const base64Data = buffer.toString('base64');
    const imageUrl = `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;
    const systemPrompt = `You are an expert financial ledger receipt and mobile money (MoMo) extraction engine.
Analyze the provided receipt or invoice screenshot image and extract all financial data accurately into structured JSON matching this exact schema:
{
  "merchant": "Store, vendor, or recipient/sender name",
  "amount": 64.10, // Total final amount to pay (number, not string)
  "currency": "GHS", // "GHS" or "XOF"
  "date": "2026-10-15T19:04:39.000Z", // ISO date from receipt or current ISO date
  "transactionReference": "TILL120261015-455504", // Receipt or transaction reference ID
  "amountPaid": 200.00, // Cash or amount tendered by customer if present (or null)
  "change": 135.90, // Change returned to customer if present (or null)
  "itemQty": 3, // Total physical items purchased
  "items": [
    {
      "id": "item-1",
      "name": "LIFEBOUY SOAP ASST. 175G",
      "quantity": 2,
      "unitPrice": 22.80,
      "totalPrice": 45.60,
      "categoryId": "cat-other", // 'cat-food', 'cat-transport', 'cat-academic', 'cat-personal', 'cat-housing', 'cat-other'
      "categoryName": "Personal Care",
      "selected": true
    }
  ],
  "confidence": {
    "amount": true,
    "merchant": true,
    "category": true,
    "reference": true
  },
  "uncertainNote": null
}

IMPORTANT RULES:
- "amount": Must be the actual total purchase amount due. Never confuse cash given ("Paid") or change returned ("Change") with the purchase total.
- "items": List EVERY distinct product item line on the receipt with its original name (keep original receipt language/spelling), quantity, unit price, and line subtotal.
- Return ONLY valid raw JSON without extra conversational text.`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config_js_1.config.openaiApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `Analyze this receipt image (${fileName}) and extract all transaction details and itemized products.` },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1
        })
    });
    const data = await response.json();
    if (!response.ok) {
        const errorMsg = data?.error?.message || `OpenAI API HTTP error ${response.status}`;
        console.error('[GPT-4o Vision Error]', data);
        if (data?.error?.code === 'credit_balance_exhausted' || data?.error?.type === 'insufficient_quota') {
            throw new Error(`OpenAI credit balance exhausted. Please add credits at https://platform.openai.com/settings/organization/billing.`);
        }
        throw new Error(errorMsg);
    }
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('Empty response received from GPT-4o.');
    }
    const parsed = JSON.parse(content);
    console.log(`[GPT-4o Vision] Extraction successful: ${parsed.merchant} | Total: ${parsed.amount} ${parsed.currency} | ${parsed.items?.length || 0} item(s)`);
    return parsed;
}
/**
 * POST /api/captures
 * Intelligent Receipt and MoMo screenshot vision extraction via OpenAI GPT-4o
 */
exports.capturesRouter.post('/captures', sync_routes_js_1.authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const fileName = (req.body?.fileName || file?.originalname || 'capture.jpg').toLowerCase();
        const mimeType = file?.mimetype || 'image/jpeg';
        if (!file || !file.buffer) {
            return res.status(400).json({ success: false, error: 'No image file provided.' });
        }
        const extracted = await extractWithGPT4o(file.buffer, mimeType, fileName);
        return res.json({
            success: true,
            extracted,
            engine: 'openai-gpt-4o'
        });
    }
    catch (err) {
        console.error('[Captures Route Error]', err);
        return res.status(400).json({
            success: false,
            error: err.message || 'Error occurred during GPT-4o receipt analysis.'
        });
    }
});
/**
 * POST /api/alerts/pending-purchase-reminder (FR8)
 * Sends an email reminder 24h after Jonas pauses a purchase
 */
exports.capturesRouter.post('/alerts/pending-purchase-reminder', sync_routes_js_1.authMiddleware, async (req, res) => {
    try {
        const { email, purchaseTitle, amountGhs, costDays, name, studentName } = req.body;
        if (!email || !purchaseTitle) {
            return res.status(400).json({ error: 'Missing required reminder parameters.' });
        }
        const recipientName = studentName || name || 'Student';
        if (resend) {
            await resend.emails.send({
                from: 'M. Pognon <coach@kgslab.com>',
                to: email,
                subject: `⏰ 24h Reflection: Do you still need "${purchaseTitle}"?`,
                html: `
          <div style="font-family: sans-serif; color: #2B1F28; padding: 20px;">
            <h2 style="color: #714B67;">M. Pognon Financial Coach</h2>
            <p>Hello ${recipientName},</p>
            <p>Yesterday, you paused an impulse purchase: <strong>${purchaseTitle}</strong> (${amountGhs} GHS, worth ${costDays} days of food).</p>
            <p>24 hours have passed. If you still genuinely need it, log in to buy it. If you can live without it, abandon it and celebrate your savings!</p>
            <p style="margin-top: 24px; color: #8C7B89; font-size: 12px;">Sent from Student Savings Assistant · kgslab.com</p>
          </div>
        `
            });
            return res.json({ success: true, message: '24h reminder sent.' });
        }
        return res.json({ success: true, message: 'Mock reminder processed (no Resend API key).' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/email/recap (FR15)
 * Daily recap at 06:00 and 22:00 UTC
 */
exports.capturesRouter.post('/email/recap', sync_routes_js_1.authMiddleware, async (req, res) => {
    try {
        const { email, balanceGhs, budgetDays, totalSpentToday } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }
        if (resend) {
            await resend.emails.send({
                from: 'M. Pognon <coach@kgslab.com>',
                to: email,
                subject: `📊 Your Daily Student Ledger: ${balanceGhs} GHS Remaining (${budgetDays} days)`,
                html: `
          <div style="font-family: sans-serif; color: #2B1F28; padding: 20px;">
            <h2 style="color: #714B67;">Student Savings Daily Digest</h2>
            <p>Your financial snapshot for today:</p>
            <ul>
              <li><strong>Breathing Balance:</strong> ${balanceGhs} GHS</li>
              <li><strong>Budget Days:</strong> ${budgetDays} days</li>
              <li><strong>Spent Today:</strong> ${totalSpentToday || 0} GHS</li>
            </ul>
            <p>Stay disciplined on campus today!</p>
          </div>
        `
            });
            return res.json({ success: true, message: 'Recap email dispatched.' });
        }
        return res.json({ success: true, message: 'Mock recap dispatched.' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
