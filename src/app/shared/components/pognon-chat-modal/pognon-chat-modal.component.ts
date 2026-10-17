import { Component, OnInit, ViewChild, signal, ChangeDetectorRef, inject } from '@angular/core';
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
import { generateUuidV7 } from '../../../core/utils/uuid';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'pognon';
  text: string;
  time: string;
}

export interface DailyChatSession {
  dateKey: string;      // 'YYYY-MM-DD'
  createdAt: number;    // timestamp ms
  lastActiveAt: number; // timestamp ms
  messages: ChatMessage[];
}

const CHAT_STORAGE_KEY = 'student_savings_pognon_chat_daily_session';
const LEGACY_STORAGE_KEY = 'student_savings_pognon_chat_history';

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

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly modalCtrl = inject(ModalController);
  private readonly profileFacade = inject(ProfileFacade);
  private readonly budgetFacade = inject(BudgetFacade);
  private readonly expensesFacade = inject(ExpensesFacade);
  private readonly purchasesFacade = inject(PurchasesFacade);
  public readonly currencyService = inject(CurrencyService);

  readonly isOnline = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly isTyping = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  userInput = '';

  private sessionCreatedAt = Date.now();

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

  constructor() {
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

  private getTodayDateKey(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private restoreOrInitMessages(): void {
    const todayKey = this.getTodayDateKey();
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Purge legacy storage from previous builds
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}

    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        const session: DailyChatSession = JSON.parse(saved);
        const isSameDay = session && session.dateKey === todayKey;
        const isWithin24Hours = session && (now - (session.createdAt || 0)) < ONE_DAY_MS;

        if (isSameDay && isWithin24Hours && Array.isArray(session.messages) && session.messages.length > 0) {
          this.sessionCreatedAt = session.createdAt || now;
          this.messages.set(session.messages);
          this.cdr.detectChanges();
          setTimeout(() => this.scrollToBottom(), 200);
          return;
        } else {
          // Session expired or from a previous day: delete it completely!
          console.info(`[PognonChat] Previous day's session (${session?.dateKey}) deleted. Starting fresh 24h daily session.`);
          localStorage.removeItem(CHAT_STORAGE_KEY);
        }
      } catch (err) {
        console.warn('[PognonChat] Failed to parse previous daily session, resetting.', err);
        localStorage.removeItem(CHAT_STORAGE_KEY);
      }
    }

    this.sessionCreatedAt = now;
    this.initWelcomeMessage();
  }

  private initWelcomeMessage(): void {
    const studentName = this.userProfile?.name ? this.userProfile.name : 'friend';
    const balance = this.consumption ? this.consumption.balanceGhs.toFixed(2) : '600.00';
    const curr = this.currencyService.activeCurrency();

    const welcomeMsg: ChatMessage = {
      id: generateUuidV7(),
      sender: 'pognon',
      text: `Hey ${studentName}! My eyes are glued to your ledger. You have ${balance} ${curr} of breathing room left this cycle. What desire is tempting you or what do you want to audit?`,
      time: this.formatNow()
    };

    this.messages.set([welcomeMsg]);
    this.saveChatHistory();
    this.cdr.detectChanges();
    setTimeout(() => this.scrollToBottom(), 200);
  }

  private saveChatHistory(): void {
    try {
      const todayKey = this.getTodayDateKey();
      const recent = this.messages().slice(-50);
      const session: DailyChatSession = {
        dateKey: todayKey,
        createdAt: this.sessionCreatedAt,
        lastActiveAt: Date.now(),
        messages: recent
      };
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('[PognonChat] Could not save daily chat session to storage', e);
    }
  }

  clearChat(): void {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    this.sessionCreatedAt = Date.now();
    this.initWelcomeMessage();
  }

  sendSuggestion(suggestion: string): void {
    this.userInput = suggestion;
    this.sendMessage();
  }

  async sendMessage(): Promise<void> {
    const text = this.userInput.trim();
    if (!text || this.isTyping()) return;

    // 1. Add user message
    const userMsg: ChatMessage = {
      id: generateUuidV7(),
      sender: 'user',
      text,
      time: this.formatNow()
    };

    this.messages.update(msgs => [...msgs, userMsg]);
    this.saveChatHistory();
    this.userInput = '';
    this.isTyping.set(true);
    this.cdr.detectChanges();
    this.scrollToBottom();

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
          body: JSON.stringify({
            message: text,
            context: {
              studentName: this.userProfile?.name || 'Student',
              balance: this.consumption?.balanceGhs || 600,
              currency: this.currencyService.activeCurrency()
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          if (data && data.reply) {
            this.messages.update(msgs => [
              ...msgs,
              {
                id: generateUuidV7(),
                sender: 'pognon',
                text: data.reply,
                time: this.formatNow()
              }
            ]);
            this.saveChatHistory();
            this.isTyping.set(false);
            this.cdr.detectChanges();
            this.scrollToBottom();
            return;
          }
        }
      } catch (err) {
        console.warn('[PognonChat] Online worker chat unavailable or timed out, using local coach heuristics.', err);
      }
    }

    // 3. Graceful offline fallback with local heuristics
    setTimeout(() => {
      this.generatePognonResponse(text);
      this.isTyping.set(false);
      this.cdr.detectChanges();
      this.scrollToBottom();
    }, 400);
  }

  private generatePognonResponse(query: string): void {
    const lower = query.toLowerCase();
    const balance = this.consumption?.balanceGhs || 600;
    const curr = this.currencyService.activeCurrency();
    const name = this.userProfile?.name || 'friend';

    let reply = '';

    if (lower.includes('sneaker') || lower.includes('shoe') || lower.includes('buy') || lower.includes('weekend')) {
      const daily = (balance / 30).toFixed(0);
      reply = `Let's look at cold facts, ${name}: with ${balance.toFixed(0)} ${curr} left, your daily allowance is around ${daily} ${curr}/day. Dropping that much on this purchase amputates 2 full weeks of campus cafeteria meals! My verdict: place it on a 48h cool-off in your hesitation list. If you still crave it in 2 days, we'll talk.`;
    } else if (lower.includes('plan') || lower.includes('finish') || lower.includes('month') || lower.includes('emergency')) {
      reply = `Here is your campus battle plan, ${name}: 1) Zero restaurant outings off-campus until Friday. 2) Stick to the campus cafeteria meals or shared cooking. 3) Take Trotros or shared campus shuttles. You have ${balance.toFixed(0)} ${curr}, that's plenty if you don't surrender to impulse!`;
    } else if (lower.includes('food') || lower.includes('meal') || lower.includes('cafeteria') || lower.includes('eat') || lower.includes('waakye')) {
      reply = `Food is the number one spending trap for students in Accra and on campus. For every meal, ask yourself if you have groceries in your dorm. Batch cooking or pooling bulk groceries with roommates cuts food bills by 40% starting this week.`;
    } else {
      reply = `I hear you, ${name}. Remember my motto: every cedi or CFA saved today is a day of freedom and peace of mind during your end-of-semester exams. What do you want to audit next?`;
    }

    this.messages.update(msgs => [
      ...msgs,
      {
        id: generateUuidV7(),
        sender: 'pognon',
        text: reply,
        time: this.formatNow()
      }
    ]);
    this.saveChatHistory();
    this.cdr.detectChanges();
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
