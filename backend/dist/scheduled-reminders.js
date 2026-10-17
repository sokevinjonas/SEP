"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const reminder_service_js_1 = require("./services/reminder.service.js");
/**
 * Netlify Scheduled Function: runs automatically at 06:00 and 22:00 UTC
 * Configured in netlify.toml: [functions."scheduled-reminders"] schedule = "0 6,22 * * *"
 */
const handler = async (event, context) => {
    console.log('[Netlify Scheduled Function] Triggered scheduled-reminders at:', new Date().toISOString());
    try {
        const result = await reminder_service_js_1.reminderService.runScheduledTasks();
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result)
        };
    }
    catch (err) {
        console.error('[Netlify Scheduled Function Error]', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || 'Error running scheduled tasks' })
        };
    }
};
exports.handler = handler;
