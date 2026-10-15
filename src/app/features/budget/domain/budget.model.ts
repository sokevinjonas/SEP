import { Category, MonthlyBudget } from '../../../core/models/financial.models';

export { Category, MonthlyBudget } from '../../../core/models/financial.models';

export interface CategoryEnvelopeView {
  category: Category;
  spentGhs: number;
  allocatedGhs: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}
