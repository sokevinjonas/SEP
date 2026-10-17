"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const resend_1 = require("resend");
const config_js_1 = require("../config.js");
class EmailService {
    resend = null;
    constructor() {
        if (config_js_1.config.resendApiKey) {
            this.resend = new resend_1.Resend(config_js_1.config.resendApiKey);
        }
    }
    async sendOtpEmail(toEmail, otpCode, isNew = false) {
        const subject = isNew
            ? `🎉 Welcome to Student Savings! Your activation code: ${otpCode}`
            : `[Student Savings] Your verification code: ${otpCode}`;
        const title = isNew
            ? `Welcome to Student Savings!`
            : `Sign In & Cloud Sync`;
        const description = isNew
            ? `Congratulations on joining Student Savings! To confirm your email address and activate automated cloud backup for your campus budget and expenses, here is your 6-digit confirmation code:`
            : `Here is your single-use verification code to link your account and sync your campus finances securely:`;
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #EADFE7; overflow: hidden; color: #2B1F28;">
        <div style="background: linear-gradient(135deg, #714B67 0%, #58354f 100%); padding: 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.02em;">Student Savings</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Your campus financial coach</p>
        </div>

        <div style="padding: 28px 24px; text-align: center;">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #2B1F28;">${title}</h2>
          <p style="margin: 0 0 24px; font-size: 14px; color: #6B5966; line-height: 1.5;">
            ${description}
          </p>

          <div style="background: #F7F3F6; border: 2px dashed #714B67; border-radius: 14px; padding: 16px; display: inline-block; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #714B67;">${otpCode}</span>
          </div>

          <p style="margin: 0; font-size: 12px; color: #6B5966;">
            This code is valid for <strong>10 minutes</strong>.<br>
            If you did not request this verification code, you can safely ignore this email.
          </p>
        </div>

        <div style="background: #FAF8F9; padding: 14px; text-align: center; border-top: 1px solid #EADFE7; font-size: 11px; color: #6B5966;">
          Student Savings · Rigorously crafted for campus students
        </div>
      </div>
    `;
        // Always log to console for instantaneous local testing
        console.log(`\n========================================`);
        console.log(`[OTP] Email: ${toEmail} | IsNew: ${isNew} | Code: ${otpCode}`);
        console.log(`========================================\n`);
        if (!this.resend) {
            console.warn('[EmailService] RESEND_API_KEY is not set. OTP logged to console above.');
            return true;
        }
        try {
            const { error } = await this.resend.emails.send({
                from: config_js_1.config.resendFromEmail,
                to: [toEmail],
                subject,
                html
            });
            if (error) {
                console.error('[Resend Error]', error);
                return false;
            }
            return true;
        }
        catch (err) {
            console.error('[EmailService Exception]', err);
            return false;
        }
    }
    /**
     * 24h/48h Follow-up Email for Pending Purchases (Hesitation List)
     */
    async sendHesitationReminderEmail(toEmail, studentName, item) {
        const subject = `⏳ 24h Hesitation Check: Do you still need "${item.title}"?`;
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #EADFE7; overflow: hidden; color: #2B1F28;">
        <div style="background: linear-gradient(135deg, #714B67 0%, #58354f 100%); padding: 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Student Savings</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Anti-Impulse 24h Cool-Off</p>
        </div>

        <div style="padding: 28px 24px;">
          <h2 style="margin: 0 0 12px; font-size: 17px; color: #2B1F28;">Hey ${studentName || 'Student'}, your 24 hours are up!</h2>
          <p style="margin: 0 0 20px; font-size: 14px; color: #6B5966; line-height: 1.5;">
            Yesterday you put <strong>"${item.title}"</strong> (${item.price} ${item.currency}) on pause to protect your campus allowance.
          </p>

          <div style="background: #F7F3F6; border-radius: 14px; padding: 18px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0 0 6px; font-size: 12px; color: #6B5966; text-transform: uppercase; font-weight: 700;">Considered Item</p>
            <h3 style="margin: 0; font-size: 20px; color: #714B67;">${item.title}</h3>
            <p style="margin: 6px 0 0; font-size: 16px; font-weight: 800; color: #017e84;">${item.price} ${item.currency}</p>
          </div>

          <p style="font-size: 14px; color: #2B1F28; line-height: 1.5; margin-bottom: 24px;">
            M. Pognon's question: <em>Do you still desire this purchase, or can you pocket this amount as pure savings?</em>
          </p>

          <div style="text-align: center;">
            <a href="https://student-savings.netlify.app" style="display: inline-block; background: #714B67; color: #FFFFFF; font-weight: 800; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
              Open Student Savings
            </a>
          </div>
        </div>

        <div style="background: #FAF8F9; padding: 14px; text-align: center; border-top: 1px solid #EADFE7; font-size: 11px; color: #6B5966;">
          Student Savings · Mindful spending for university students
        </div>
      </div>
    `;
        console.log(`[Reminder Email] Sending 24h follow-up to ${toEmail} for "${item.title}"`);
        if (!this.resend) {
            console.warn('[EmailService] RESEND_API_KEY is not set. Logged to console above.');
            return true;
        }
        try {
            const { error } = await this.resend.emails.send({
                from: config_js_1.config.resendFromEmail,
                to: [toEmail],
                subject,
                html
            });
            return !error;
        }
        catch {
            return false;
        }
    }
    /**
     * Daily Budget Digest (06:00 and 22:00 UTC)
     */
    async sendDailyDigestEmail(toEmail, studentName, digest) {
        const subject = `📊 Your Daily Campus Financial Digest · ${digest.balance} ${digest.currency} remaining`;
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #EADFE7; overflow: hidden; color: #2B1F28;">
        <div style="background: linear-gradient(135deg, #714B67 0%, #58354f 100%); padding: 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Student Savings</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Daily Financial Ledger Digest</p>
        </div>

        <div style="padding: 28px 24px;">
          <h2 style="margin: 0 0 8px; font-size: 17px; color: #2B1F28;">Good day, ${studentName || 'Student'}!</h2>
          <p style="margin: 0 0 20px; font-size: 14px; color: #6B5966;">Here is your campus ledger snapshot:</p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
            <div style="background: #F7F3F6; border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 11px; color: #6B5966; text-transform: uppercase; font-weight: 700;">Remaining Balance</span>
              <p style="margin: 4px 0 0; font-size: 20px; font-weight: 900; color: #714B67;">${digest.balance} ${digest.currency}</p>
            </div>
            <div style="background: #F7F3F6; border-radius: 12px; padding: 14px; text-align: center;">
              <span style="font-size: 11px; color: #6B5966; text-transform: uppercase; font-weight: 700;">Safe Daily Rate</span>
              <p style="margin: 4px 0 0; font-size: 20px; font-weight: 900; color: #017e84;">${digest.safeDaily} ${digest.currency}/day</p>
            </div>
          </div>

          <p style="font-size: 13px; color: #6B5966; line-height: 1.4; margin: 0 0 20px;">
            Stay mindful on campus food and transit today. Every cedi saved is peace of mind during exam season!
          </p>

          <div style="text-align: center;">
            <a href="https://student-savings.netlify.app" style="display: inline-block; background: #714B67; color: #FFFFFF; font-weight: 800; font-size: 13px; padding: 10px 22px; border-radius: 10px; text-decoration: none;">
              Open Ledger
            </a>
          </div>
        </div>

        <div style="background: #FAF8F9; padding: 14px; text-align: center; border-top: 1px solid #EADFE7; font-size: 11px; color: #6B5966;">
          Student Savings · Built for campus students
        </div>
      </div>
    `;
        console.log(`[Digest Email] Sending daily digest to ${toEmail}`);
        if (!this.resend) {
            console.warn('[EmailService] RESEND_API_KEY is not set. Logged to console above.');
            return true;
        }
        try {
            const { error } = await this.resend.emails.send({
                from: config_js_1.config.resendFromEmail,
                to: [toEmail],
                subject,
                html
            });
            return !error;
        }
        catch {
            return false;
        }
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
