import { Resend } from 'resend';
import { config } from '../config.js';

export class EmailService {
  private resend: Resend | null = null;

  constructor() {
    if (config.resendApiKey) {
      this.resend = new Resend(config.resendApiKey);
    }
  }

  async sendOtpEmail(toEmail: string, otpCode: string, isNew = false): Promise<boolean> {
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
        from: config.resendFromEmail,
        to: [toEmail],
        subject,
        html
      });

      if (error) {
        console.error('[Resend Error]', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[EmailService Exception]', err);
      return false;
    }
  }
}

export const emailService = new EmailService();
