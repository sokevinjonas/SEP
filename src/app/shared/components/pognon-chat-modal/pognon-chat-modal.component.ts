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
    'Puis-je me payer des baskets ce weekend ?',
    'Donne-moi un plan pour finir le mois',
    'Comment réduire mon budget nourriture ?'
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
    const studentName = this.userProfile?.name ? this.userProfile.name : 'ami';
    const balance = this.consumption ? this.consumption.balanceGhs.toFixed(2) : '600.00';
    const curr = this.currencyService.activeCurrency();

    const welcomeMsg: ChatMessage = {
      id: `pog-init-${Date.now()}`,
      sender: 'pognon',
      text: `Salut ${studentName} ! J'ai les yeux rivés sur ton grand livre. Il te reste ${balance} ${curr} de marge pour ce cycle. Quelle envie te tente ou quelle dépense veux-tu auditer ?`,
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
      id: `usr-${Date.now()}`,
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
                id: `pog-${Date.now()}`,
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
    const name = this.userProfile?.name || 'ami';

    let reply = '';

    if (lower.includes('sneaker') || lower.includes('shoe') || lower.includes('basket') || lower.includes('buy') || lower.includes('weekend') || lower.includes('achat') || lower.includes('acheter')) {
      const daily = (balance / 30).toFixed(0);
      reply = `Regardons les faits froids, ${name} : avec environ ${balance.toFixed(0)} ${curr} restants, ton allocation quotidienne est d'environ ${daily} ${curr}/jour. Débourser pour cette dépense ampute 2 semaines de repas au campus ! Mon verdict : place cet article en temporisation 48h dans tes achats réfléchis. Si l'envie persiste après 2 jours, nous ferons le bilan.`;
    } else if (lower.includes('plan') || lower.includes('finish') || lower.includes('month') || lower.includes('mois') || lower.includes('finir') || lower.includes('urgence')) {
      reply = `Voici ton plan de combat pour le campus : 1) Zéro sortie restaurant hors-campus jusqu'à vendredi. 2) Privilégie les repas économiques du campus ou la cuisine partagée. 3) Prends le trotro ou les navettes partagées. Tu as ${balance.toFixed(0)} ${curr}, c'est largement suffisant si tu ne cèdes pas aux impulsions !`;
    } else if (lower.includes('food') || lower.includes('meal') || lower.includes('cafeteria') || lower.includes('eat') || lower.includes('manger') || lower.includes('repas') || lower.includes('nourriture') || lower.includes('waakye') || lower.includes('faim')) {
      reply = `L'alimentation est le piège numéro 1 des étudiants à Accra et sur le campus. Pour chaque repas, demande-toi si tu as déjà des provisions. Cuisiner ou mutualiser les courses avec des colocataires réduit la facture de 40% dès cette semaine.`;
    } else {
      reply = `Je t'entends bien, ${name}. N'oublie pas ma devise : chaque cedi ou franc CFA préservé aujourd'hui est une bouffée d'oxygène pendant les examens de fin de semestre. Que souhaites-tu auditer ensuite ?`;
    }

    this.messages.update(msgs => [
      ...msgs,
      {
        id: `pog-${Date.now()}`,
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
