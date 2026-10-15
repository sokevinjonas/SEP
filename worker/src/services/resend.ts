import { Env } from '../types';

export class ResendService {
  constructor(private env: Env) {}

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.env.RESEND_API_KEY) {
      console.warn('[Resend] RESEND_API_KEY is not configured. Email logged to console instead:', subject);
      return true;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.env.RESEND_FROM_EMAIL || 'M. Pognon <coach@kgslab.com>',
          to: [to],
          subject,
          html
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Resend Error]', response.status, errorText);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Resend Network Error]', err);
      return false;
    }
  }

  // Story 4.4: Deterministic Budget Threshold Escalation Alerts
  async sendThresholdAlert(
    categoryName: string,
    threshold: 70 | 90 | 100,
    spent: number,
    allocated: number
  ): Promise<boolean> {
    const to = this.env.JONAS_EMAIL || 'jonas@kgslab.com';
    let subject = '';
    let headline = '';
    let bodyText = '';
    let alertColor = '#FFB74D';

    if (threshold === 70) {
      subject = `[M. Pognon] Conseil : 70% consommés sur "${categoryName}"`;
      headline = 'Attention au rythme des dépenses';
      bodyText = `Tu as déjà dépensé ${spent.toFixed(2)} GHS sur ton budget alloué de ${allocated.toFixed(2)} GHS (70%). Ralentis dès aujourd'hui pour garder ta marge de sécurité jusqu'à la fin du mois.`;
      alertColor = '#017E84';
    } else if (threshold === 90) {
      subject = `[M. Pognon] Avertissement ferme : 90% sur "${categoryName}"`;
      headline = 'Zone rouge imminente';
      bodyText = `Alerte 90% ! Il ne te reste que ${(allocated - spent).toFixed(2)} GHS sur "${categoryName}". Tout achat superflu dans cette catégorie est formellement déconseillé jusqu'au mois prochain.`;
      alertColor = '#E65100';
    } else {
      subject = `[M. Pognon] URGENT : Dépassement 100% sur "${categoryName}"`;
      headline = 'Plafond franchi';
      bodyText = `Tu as consommé l'intégralité (${spent.toFixed(2)} GHS / ${allocated.toFixed(2)} GHS) de ton enveloppe "${categoryName}". Chaque dépense supplémentaire amputera directement tes économies.`;
      alertColor = '#c0392b';
    }

    const html = this.buildEmailTemplate(headline, bodyText, alertColor, [
      { label: 'Catégorie', value: categoryName },
      { label: 'Dépensé', value: `${spent.toFixed(2)} GHS` },
      { label: 'Plafond', value: `${allocated.toFixed(2)} GHS` },
      { label: 'Consommation', value: `${threshold}%` }
    ]);

    return this.sendEmail(to, subject, html);
  }

  // Story 4.5: Morning Recap (06:00 UTC)
  async sendMorningRecap(
    dailyAllowance: number,
    remainingBalance: number,
    daysLeft: number,
    pendingPurchasesCount: number,
    isDataStale: boolean
  ): Promise<boolean> {
    const to = this.env.JONAS_EMAIL || 'jonas@kgslab.com';
    const subject = `[M. Pognon] Réveil Financier : ${dailyAllowance.toFixed(0)} GHS autorisés aujourd'hui`;
    const headline = 'Votre cap financier du matin';
    const bodyText = `Bonjour Jonas. Voici votre allocation du jour pour garder le cap sur le campus. Rappelez-vous : une dépense évitée est une victoire pour votre semestre.${
      isDataStale ? ' (Attention : Données synchronisées il y a plus de 24h).' : ''
    }`;

    const html = this.buildEmailTemplate(headline, bodyText, '#714B67', [
      { label: 'Allocation du jour', value: `${dailyAllowance.toFixed(2)} GHS` },
      { label: 'Solde respiratoire', value: `${remainingBalance.toFixed(2)} GHS` },
      { label: 'Jours restants', value: `${daysLeft} jours` },
      { label: 'Achats en réflexion', value: `${pendingPurchasesCount} article(s)` }
    ]);

    return this.sendEmail(to, subject, html);
  }

  // Story 4.5: Evening Recap (22:00 UTC)
  async sendEveningRecap(
    todaySpent: number,
    monthSpent: number,
    avoidedTotal: number,
    isDataStale: boolean
  ): Promise<boolean> {
    const to = this.env.JONAS_EMAIL || 'jonas@kgslab.com';
    const subject = `[M. Pognon] Bilan du Soir : ${todaySpent.toFixed(2)} GHS dépensés aujourd'hui`;
    const headline = 'Clôture de la journée';
    const bodyText = `Bonsoir Jonas. Voici le décompte de vos dépenses avant d'éteindre les lumières. Reposez-vous en toute sérénité budgétaire.${
      isDataStale ? ' (Attention : Synchronisation requise).' : ''
    }`;

    const html = this.buildEmailTemplate(headline, bodyText, '#2D1A2B', [
      { label: 'Dépenses du jour', value: `${todaySpent.toFixed(2)} GHS` },
      { label: 'Total mois en cours', value: `${monthSpent.toFixed(2)} GHS` },
      { label: 'Total Épargné Anti-Pulsion', value: `+${avoidedTotal.toFixed(2)} GHS` }
    ]);

    return this.sendEmail(to, subject, html);
  }

  // Story 4.6: 24h Cooling-Off Email Follow-up
  async sendCoolingOffReminder(itemName: string, amountGhs: number): Promise<boolean> {
    const to = this.env.JONAS_EMAIL || 'jonas@kgslab.com';
    const subject = `[M. Pognon] 24h écoulées : Toujours tenté par "${itemName}" ?`;
    const headline = 'Fin du délai de réflexion (24h)';
    const bodyText = `24 heures se sont écoulées depuis que tu as mis "${itemName}" (${amountGhs.toFixed(2)} GHS) en pause. Es-tu toujours tenté ou es-tu prêt à célébrer une victoire et ajouter ${amountGhs.toFixed(2)} GHS à ton Total Épargné ?`;

    const html = this.buildEmailTemplate(headline, bodyText, '#017E84', [
      { label: 'Article convoité', value: itemName },
      { label: 'Montant en jeu', value: `${amountGhs.toFixed(2)} GHS` },
      { label: 'Choix recommandé', value: 'Renoncer et épargner' }
    ]);

    return this.sendEmail(to, subject, html);
  }

  private buildEmailTemplate(
    headline: string,
    body: string,
    accentColor: string,
    metrics: Array<{ label: string; value: string }>
  ): string {
    const metricsHtml = metrics
      .map(
        m => `
        <tr style="border-bottom: 1px solid #EADFE7;">
          <td style="padding: 10px 0; color: #6B5966; font-size: 14px;">${m.label}</td>
          <td style="padding: 10px 0; color: #2D1A2B; font-weight: bold; font-size: 15px; text-align: right;">${m.value}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F9; margin: 0; padding: 20px; color: #2D1A2B; }
          .container { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #EADFE7; overflow: hidden; box-shadow: 0 4px 12px rgba(113, 75, 103, 0.08); }
          .header { background: #714B67; padding: 24px; text-align: center; color: #FFFFFF; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
          .header p { margin: 6px 0 0; font-size: 12px; color: #FFD700; font-weight: 700; text-transform: uppercase; }
          .content { padding: 24px; }
          .headline { font-size: 17px; font-weight: 800; color: ${accentColor}; margin: 0 0 12px; }
          .body-text { font-size: 14px; line-height: 1.5; color: #4A3A47; margin: 0 0 20px; }
          .table-box { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .footer { background: #F7F3F6; padding: 16px; text-align: center; font-size: 11px; color: #8C7588; border-top: 1px solid #EADFE7; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>M. POGNON</h1>
            <p>Coach Financier Étudiant Impitoyable</p>
          </div>
          <div class="content">
            <h2 class="headline">${headline}</h2>
            <p class="body-text">${body}</p>
            <table class="table-box">
              ${metricsHtml}
            </table>
          </div>
          <div class="footer">
            Student Expense &amp; Savings Tracker (SEP) · Développé avec rigueur pour Jonas
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
