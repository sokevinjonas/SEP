export interface Env {
  DB: D1Database;
  CAPTURES_BUCKET: R2Bucket;
  ENVIRONMENT: string;
  APP_SECRET_TOKEN: string;
  OPENAI_API_KEY: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  JONAS_EMAIL: string;
  MONTHLY_AI_BUDGET_USD: string;
}

export interface SyncPayload {
  items: Array<{
    id: string;
    type: 'expense' | 'purchase';
    action: 'create' | 'update' | 'delete';
    payload: any;
    timestamp: string;
  }>;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
  energyWarning?: boolean;
}
