import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonInput,
  IonIcon,
  IonBadge,
  ModalController,
  IonChip,
  IonAvatar,
  IonLabel,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  sendOutline,
  sparklesOutline,
  shieldCheckmarkOutline,
  flameOutline,
  cloudOfflineOutline,
  chatbubblesOutline,
  trashOutline
} from 'ionicons/icons';
import { ProfileFacade } from '../../../features/profile/facade/profile.facade';
import { BudgetFacade } from '../../../features/budget/facade/budget.facade';
import { ExpensesFacade } from '../../../features/expenses/facade/expenses.facade';
import { PurchasesFacade } from '../../../features/purchases/facade/purchases.facade';
import { CurrencyService } from '../../../core/services/currency.service';
import { BudgetConsumption } from '../../../core/services/budget-calculator.service';
import { UserProfile, MonthlyBudget, Purchase, Expense } from '../../../core/models/financial.models';
import { environment } from '../../../../environments/environment';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'pognon';
  text: string;
  time: string;
}

const CHAT_STORAGE_KEY = 'student_savings_pognon_chat_history';

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
    IonChip,
    IonAvatar,
    IonLabel,
    IonSpinner
  ],
  templateUrl: './pognon-chat-modal.component.html',
  styleUrls: ['./pognon-chat-modal.component.scss']
})
export class PognonChatModalComponent implements OnInit {
  @ViewChild(IonContent, { static: false }) content?: IonContent;

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
    private profileFacade: ProfileFacade,
    private budgetFacade: BudgetFacade,
    private expensesFacade: ExpensesFacade,
    private purchasesFacade: PurchasesFacade,
    public currencyService: CurrencyService
  ) {
    addIcons({
      closeOutline,
      sendOutline,
      sparklesOutline,
      shieldCheckmarkOutline,
      flameOutline,
      cloudOfflineOutline,
      chatbubblesOutline,
      trashOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadFinancialContext();
    this.restoreOrInitMessages();
  }

  private async loadFinancialContext(): Promise<void> {
    await Promise.all([
      this.profileFacade.load(),
      this.budgetFacade.load(),
      this.expensesFacade.load(),
      this.purchasesFacade.load()
    ]);

    this.userProfile = this.profileFacade.userProfile();
    this.monthlyBudget = this.budgetFacade.monthlyBudget();
    this.allExpenses = [...this.expensesFacade.expenses()];
    this.consumption = this.budgetFacade.consumption();
    this.pendingPurchases = [...this.purchasesFacade.pendingPurchases()];
  }

  private restoreOrInitMessages(): void {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages = parsed;
          setTimeout(() => this.scrollToBottom(), 200);
          return;
        }
      } catch {
        // Fallback to init
      }
    }
    this.initWelcomeMessage();
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
    this.saveChatHistory();
    setTimeout(() => this.scrollToBottom(), 200);
  }

  private saveChatHistory(): void {
    try {
      const recent = this.messages.slice(-50);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(recent));
    } catch (e) {
      console.warn('[PognonChat] Could not save chat history to storage', e);
    }
  }

  clearChat(): void {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    this.initWelcomeMessage();
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
    this.saveChatHistory();
    this.scrollToBottom();

    this.userInput = '';
    this.isTyping = true;

    // 2. Attempt online backend call to /api/chat (AI LLM)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`${environment.workerUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${environment.appSecretToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: text }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          if (data && data.reply) {
            this.messages.push({
              id: `pog-${Date.now()}`,
              sender: 'pognon',
              text: data.reply,
              time: this.formatNow()
            });
            this.saveChatHistory();
            this.isTyping = false;
            this.scrollToBottom();
            return;
          }
        }
      } catch (err) {
        console.warn('[PognonChat] Online worker chat unavailable, using local coach heuristics.', err);
      }
    }

    // 3. Graceful offline fallback with local heuristics
    setTimeout(() => {
      this.generatePognonResponse(text);
      this.isTyping = false;
      this.scrollToBottom();
    }, 600);
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
    this.saveChatHistory();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.content?.scrollToBottom(250);
    }, 50);
  }

  private formatNow(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
