import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonInput,
  IonIcon,
  IonAvatar,
  IonChip,
  IonLabel,
  IonSpinner,
  ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  sendOutline,
  sparklesOutline,
  shieldCheckmarkOutline,
  flameOutline,
  cloudOfflineOutline,
  chatbubblesOutline
} from 'ionicons/icons';
import { DatabaseService } from '../../../core/db/database.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { BudgetCalculatorService, BudgetConsumption } from '../../../core/services/budget-calculator.service';
import { MonthlyBudget, UserProfile, Purchase, Expense } from '../../../core/models/financial.models';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'pognon';
  text: string;
  time: string;
}

@Component({
  selector: 'app-pognon-chat-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonInput,
    IonIcon,
    IonAvatar,
    IonChip,
    IonLabel,
    IonSpinner
  ],
  templateUrl: './pognon-chat-modal.component.html',
  styleUrls: ['./pognon-chat-modal.component.scss']
})
export class PognonChatModalComponent implements OnInit {
  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  userInput = '';
  isTyping = false;

  messages: ChatMessage[] = [];

  userProfile: UserProfile | null = null;
  monthlyBudget: MonthlyBudget | null = null;
  consumption: BudgetConsumption | null = null;
  pendingPurchases: Purchase[] = [];
  allExpenses: Expense[] = [];

  quickSuggestions = [
    'Puis-je m\'offrir des baskets ce weekend ?',
    'Donne-moi un plan pour finir le mois',
    'Comment réduire mon budget repas ?'
  ];

  constructor(
    private modalCtrl: ModalController,
    private db: DatabaseService,
    public currencyService: CurrencyService,
    private budgetCalculator: BudgetCalculatorService
  ) {
    addIcons({
      closeOutline,
      sendOutline,
      sparklesOutline,
      shieldCheckmarkOutline,
      flameOutline,
      cloudOfflineOutline,
      chatbubblesOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadFinancialContext();
    this.initWelcomeMessage();
  }

  private async loadFinancialContext(): Promise<void> {
    this.userProfile = await this.db.getUserProfile();
    this.monthlyBudget = await this.db.getMonthlyBudget();
    this.allExpenses = await this.db.getExpenses();

    const currentMonthKey = this.db.getCurrentMonthKey();
    const monthExpenses = this.allExpenses.filter(e => e.date.startsWith(currentMonthKey));
    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    this.consumption = this.budgetCalculator.calculateConsumption(
      this.monthlyBudget.totalBudgetGhs,
      totalSpent
    );

    const purchases = await this.db.getPurchases();
    this.pendingPurchases = purchases.filter(p => p.status === 'pending');
  }

  private initWelcomeMessage(): void {
    const studentName = this.userProfile?.name ? this.userProfile.name : 'l\'ami';
    const balance = this.consumption ? this.consumption.balanceGhs.toFixed(2) : '600.00';
    const curr = this.currencyService.activeCurrency();

    this.messages = [
      {
        id: 'msg-init-1',
        sender: 'pognon',
        text: `Salut ${studentName} ! J'ai les yeux rivés sur ton grand livre. Il te reste ${balance} ${curr} de solde respiratoire ce mois-ci. Qu'est-ce qui te taraude ou quelle folie te tente en ce moment ?`,
        time: this.formatNow()
      }
    ];
  }

  sendSuggestion(suggestion: string): void {
    this.userInput = suggestion;
    this.sendMessage();
  }

  async sendMessage(): Promise<void> {
    const text = this.userInput.trim();
    if (!text || this.isTyping) return;

    // 1. Add user message
    this.messages.push({
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      time: this.formatNow()
    });

    this.userInput = '';
    this.isTyping = true;

    // Simulate smart backend response with real financial context
    setTimeout(() => {
      this.generatePognonResponse(text);
      this.isTyping = false;
    }, 900);
  }

  private generatePognonResponse(query: string): void {
    const lower = query.toLowerCase();
    const balance = this.consumption?.balanceGhs || 600;
    const curr = this.currencyService.activeCurrency();
    const name = this.userProfile?.name || 'Étudiant';

    let reply = '';

    if (lower.includes('basket') || lower.includes('chaussure') || lower.includes('acheter') || lower.includes('weekend')) {
      const daily = (balance / 30).toFixed(0);
      reply = `Regardons les faits froids, ${name} : avec ${balance.toFixed(0)} ${curr} en caisse, ton allocation quotidienne est d'environ ${daily} ${curr}/jour. Si tu lâches 200 ou 300 ${curr} dans une paire de baskets, tu amputes 2 semaines de cafétéria ! Mon verdict : utilise « I want to buy » et laisse mijoter 48h. Si dans 2 jours ça te hante encore, on en reparle.`;
    } else if (lower.includes('plan') || lower.includes('finir') || lower.includes('mois') || lower.includes('urgence')) {
      reply = `Voici ton plan de combat campus : 1) Zéro sortie restaurant hors campus jusqu'à vendredi. 2) Priorise les repas étudiants de la cantine à 15 ${curr}. 3) Prends le Trotro ou les navettes partagées. Tu as ${balance.toFixed(0)} ${curr}, c'est suffisant si tu ne cédes à aucune pulsion !`;
    } else if (lower.includes('repas') || lower.includes('cafétéria') || lower.includes('manger') || lower.includes('nourriture')) {
      reply = `L'alimentation est le plus grand piège de l'étudiant à Accra et sur les campus. Pour chaque waakye ou plat acheté, demande-toi si tu as des restes dans ta chambre. Cuisiner ou mutualiser les achats avec des colocataires te fera économiser 40% dès cette semaine.`;
    } else {
      reply = `Je t'entends, ${name}. Rappelle-toi ma devise : chaque cedi ou franc CFA économisé aujourd'hui est un jour de liberté et de sérénité pour tes examens de fin de semestre. Que veux-tu auditer maintenant ?`;
    }

    this.messages.push({
      id: `pog-${Date.now()}`,
      sender: 'pognon',
      text: reply,
      time: this.formatNow()
    });
  }

  private formatNow(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
