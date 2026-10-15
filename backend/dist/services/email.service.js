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
    async sendOtpEmail(toEmail, otpCode) {
        const subject = `[Student Savings] Votre code de connexion : ${otpCode}`;
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #EADFE7; overflow: hidden; color: #2B1F28;">
        <div style="background: linear-gradient(135deg, #714B67 0%, #58354f 100%); padding: 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.02em;">Student Savings</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Votre coach financier étudiant</p>
        </div>

        <div style="padding: 28px 24px; text-align: center;">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #2B1F28;">Connexion sécurisée</h2>
          <p style="margin: 0 0 24px; font-size: 14px; color: #6B5966; line-height: 1.5;">
            Voici votre code de vérification à usage unique pour vous connecter et synchroniser vos données d'épargne :
          </p>

          <div style="background: #F7F3F6; border: 2px dashed #714B67; border-radius: 14px; padding: 16px; display: inline-block; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #714B67;">${otpCode}</span>
          </div>

          <p style="margin: 0; font-size: 12px; color: #6B5966;">
            Ce code est valable pendant <strong>10 minutes</strong>.<br>
            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
          </p>
        </div>

        <div style="background: #FAF8F9; padding: 14px; text-align: center; border-top: 1px solid #EADFE7; font-size: 11px; color: #6B5966;">
          Student Savings · Conçu avec rigueur pour les étudiants de campus
        </div>
      </div>
    `;
        // Always log to console for instantaneous local testing
        console.log(`\n========================================`);
        console.log(`[OTP] Email: ${toEmail} | Code: ${otpCode}`);
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
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
