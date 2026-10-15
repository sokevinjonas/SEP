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
    'Can I afford sneakers this weekend?',
    'Give me a plan to finish the month',
    'How do I cut my cafeteria food budget?'
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
    const studentName = this.userProfile?.name ? this.userProfile.name : 'friend';
    const balance = this.consumption ? this.consumption.balanceGhs.toFixed(2) : '600.00';
    const curr = this.currencyService.activeCurrency();

    this.messages = [
      {
        id: 'msg-init-1',
        sender: 'pognon',
        text: `Hey ${studentName}! My eyes are glued to your ledger. You have ${balance} ${curr} of breathing room left this month. What desire is tempting you or what do you want to audit?`,
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
    const name = this.userProfile?.name || 'Student';

    let reply = '';

    if (lower.includes('sneaker') || lower.includes('shoe') || lower.includes('basket') || lower.includes('buy') || lower.includes('weekend')) {
      const daily = (balance / 30).toFixed(0);
      reply = `Let's look at cold facts, ${name}: with ${balance.toFixed(0)} ${curr} in your pocket, your daily allowance is around ${daily} ${curr}/day. Dropping 200 or 300 ${curr} on sneakers amputates 2 full weeks of cafeteria meals! My verdict: tap "I want to buy", let it simmer for 48h. If you still crave it in 2 days, we'll talk.`;
    } else if (lower.includes('plan') || lower.includes('finish') || lower.includes('month') || lower.includes('emergency')) {
      reply = `Here is your campus battle plan: 1) Zero restaurant outings off-campus until Friday. 2) Stick to the 15 ${curr} campus cafeteria meals. 3) Take Trotros or shared shuttles. You have ${balance.toFixed(0)} ${curr}, that's plenty if you don't surrender to impulse!`;
    } else if (lower.includes('food') || lower.includes('meal') || lower.includes('cafeteria') || lower.includes('eat') || lower.includes('waakye')) {
      reply = `Food is the number one spending trap for students in Accra and on campus. For every waakye or meal, ask yourself if you have groceries in your dorm. Cooking or pooling bulk groceries with roommates cuts food bills by 40% starting this week.`;
    } else {
      reply = `I hear you, ${name}. Remember my motto: every cedi or CFA saved today is a day of freedom and peace of mind during your end-of-semester exams. What do you want to audit next?`;
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
