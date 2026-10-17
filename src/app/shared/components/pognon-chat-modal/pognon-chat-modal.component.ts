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
    'Audit & Auto-Setup Envelopes',
    'Log 15 GHS for Food',
    'Can I afford sneakers this weekend?',
    'Undo last expense'
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
      text: `Hey ${studentName}! My eyes are glued to your ledger. You have ${balance} ${curr} of breathing room left this cycle. What desire is tempting you, or what action would you like me to execute?`,
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

  /**
   * M. Pognon Agentic Execution Engine:
   * Parses text commands and directly executes CRUD or state modifications on behalf of the student.
   */
  private async tryExecuteAgenticAction(text: string): Promise<string | null> {
    const lower = text.toLowerCase();

    // 1. Audit & Auto-Setup Budget / Discovery Graduation
    if (
      lower.includes('audit') ||
      lower.includes('adopt budget') ||
      lower.includes('auto-setup') ||
      lower.includes('setup envelopes') ||
      lower.includes('auto-configure') ||
      lower.includes('analyze my spending') ||
      lower.includes('analyze spending') ||
      lower.includes('discovery report')
    ) {
      const suggestion = this.budgetFacade.getAiBudgetSuggestion();
      await this.budgetFacade.adoptAiSuggestedBudget(suggestion.suggestedBudget, suggestion.suggestedBreakdown);
      await this.loadFinancialContext();

      const conclusionsFormatted = suggestion.conclusions.map(c => `• ${c}`).join('\n');
      const breakdownFormatted = suggestion.suggestedBreakdown.map(b => `• ${b.categoryName}: ${b.suggestedAllocationGhs} GHS (${b.percentage}%)`).join('\n');

      return `I have conducted a complete audit of your campus ledger:\n` +
        `• Total Spent: ${suggestion.totalSpent.toFixed(2)} GHS across ${suggestion.daysElapsed} day(s)\n` +
        `• Daily Burn Velocity: ${suggestion.dailyBurnRate.toFixed(2)} GHS/day\n` +
        `• Top Category: ${suggestion.topCategoryName} (${suggestion.topCategoryPercent}% of budget)\n\n` +
        `Key Findings:\n${conclusionsFormatted}\n\n` +
        `Automated Envelope Blueprint:\n${breakdownFormatted}\n\n` +
        `Done! I have automatically configured your monthly budget ceiling to ${suggestion.suggestedBudget} GHS and allocated all your category envelopes. Discovery Mode has graduated into Active Budgeting!`;
    }

    // 2. Undo / Delete Last Expense CRUD
    if (
      lower.includes('undo') ||
      lower.includes('delete last expense') ||
      lower.includes('cancel last expense') ||
      lower.includes('remove last expense')
    ) {
      const expenses = [...this.expensesFacade.expenses()];
      if (expenses.length > 0) {
        expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastExp = expenses[0];
        await this.expensesFacade.deleteExpense(lastExp.id);
        await this.loadFinancialContext();
        const balance = this.consumption?.balanceGhs.toFixed(2) || '0.00';
        return `Done! I have deleted your last expense of ${lastExp.amount.toFixed(2)} ${lastExp.currency} for "${lastExp.merchant || lastExp.categoryName}". Your ledger balance is restored to ${balance} GHS.`;
      } else {
        return `You have no recent expenses recorded in your ledger to undo.`;
      }
    }

    // 3. Log Expense CRUD
    const expenseMatch = lower.match(/(?:log|spent|pay|paid|bought|add\s+expense)\s+(?:an?\s+expense\s+of\s+)?(\d+(?:\.\d+)?)\s*(?:ghs|cedis|xof)?(?:\s+(?:for|on)?\s*([a-z\s]+))?/i);
    if (expenseMatch) {
      const amount = parseFloat(expenseMatch[1]);
      if (amount > 0) {
        const rawTarget = (expenseMatch[2] || '').trim();
        const cats = this.budgetFacade.categories();
        let matchedCat = cats.find(c => rawTarget && c.name.toLowerCase().includes(rawTarget.toLowerCase()))
          || cats.find(c => c.name.toLowerCase().includes('food') || c.id === 'cat_food')
          || cats[0];

        if (rawTarget.includes('transport') || rawTarget.includes('trotro') || rawTarget.includes('uber') || rawTarget.includes('bus')) {
          matchedCat = cats.find(c => c.name.toLowerCase().includes('transport')) || matchedCat;
        } else if (rawTarget.includes('book') || rawTarget.includes('course') || rawTarget.includes('school') || rawTarget.includes('legon')) {
          matchedCat = cats.find(c => c.name.toLowerCase().includes('academics') || c.name.toLowerCase().includes('school')) || matchedCat;
        }

        const activeCurr = this.currencyService.activeCurrency();
        const amountGhs = activeCurr === 'GHS' ? amount : this.currencyService.toGhs(amount);
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const merchant = rawTarget ? rawTarget.charAt(0).toUpperCase() + rawTarget.slice(1) : matchedCat.name;

        const expense: Expense = {
          id: generateUuidV7(),
          amount,
          currency: (activeCurr === 'XOF' ? 'XOF' : 'GHS') as 'GHS' | 'XOF',
          categoryId: matchedCat.id,
          categoryName: matchedCat.name,
          merchant,
          note: 'Logged via M. Pognon AI Agent',
          date: now.toISOString(),
          source: 'manual',
          createdAt: now.toISOString()
        };

        await this.expensesFacade.addExpense(expense);
        await this.loadFinancialContext();

        const balance = this.consumption?.balanceGhs.toFixed(2) || '0.00';
        return `Done! I have automatically logged an expense of ${amount.toFixed(2)} ${activeCurr} for ${matchedCat.name} (${merchant}). Your remaining breathing room is now ${balance} GHS.`;
      }
    }

    // 4. Update Category Envelope Allocation CRUD
    const allocMatch = lower.match(/(?:set|allocate|change|update)\s+([a-z\s]+?)\s+(?:envelope\s+|allocation\s+)?to\s+(\d+(?:\.\d+)?)/i)
      || lower.match(/(?:allocate|set)\s+(\d+(?:\.\d+)?)\s*(?:ghs)?\s+to\s+([a-z\s]+)/i);

    if (allocMatch) {
      let catNameStr = '';
      let amountVal = 0;
      if (isNaN(Number(allocMatch[1]))) {
        catNameStr = allocMatch[1].trim();
        amountVal = parseFloat(allocMatch[2]);
      } else {
        amountVal = parseFloat(allocMatch[1]);
        catNameStr = allocMatch[2].trim();
      }

      if (amountVal > 0) {
        const cats = this.budgetFacade.categories();
        const matched = cats.find(c => c.name.toLowerCase().includes(catNameStr.toLowerCase()));
        if (matched) {
          await this.budgetFacade.updateCategoryAllocation(matched.id, amountVal);
          await this.loadFinancialContext();
          return `Done! I updated the allocation for your "${matched.name}" envelope to ${amountVal} GHS.`;
        }
      }
    }

    // 5. Top-up allowance
    const topUpMatch = lower.match(/(?:top\s*up|add\s+allowance)\s+(\d+(?:\.\d+)?)/i);
    if (topUpMatch) {
      const topUpAmount = parseFloat(topUpMatch[1]);
      if (topUpAmount > 0) {
        await this.budgetFacade.addAllowanceTopUp(topUpAmount);
        await this.loadFinancialContext();
        const balance = this.consumption?.balanceGhs.toFixed(2) || '0.00';
        return `Done! I added a top-up of +${topUpAmount.toFixed(2)} GHS to your allowance. Your updated breathing balance is now ${balance} GHS.`;
      }
    }

    return null;
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

    // 2. Check if M. Pognon can directly execute an action on behalf of user
    const agenticReply = await this.tryExecuteAgenticAction(text);
    if (agenticReply) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          {
            id: generateUuidV7(),
            sender: 'pognon',
            text: agenticReply,
            time: this.formatNow()
          }
        ]);
        this.saveChatHistory();
        this.isTyping.set(false);
        this.cdr.detectChanges();
        this.scrollToBottom();
      }, 350);
      return;
    }

    // 3. Attempt online backend call to /api/chat (AI LLM)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('student_savings_auth_token') : null;
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const res = await fetch(`${environment.workerUrl}/api/chat`, {
          method: 'POST',
          headers,
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

    // 4. Graceful offline fallback with local heuristics
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
