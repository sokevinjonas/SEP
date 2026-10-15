import { Injectable } from '@angular/core';
import { Expense } from '../models/financial.models';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  constructor() {}

  exportExpensesToCsv(expenses: Expense[]): boolean {
    const headers = [
      'ID',
      'Date',
      'Amount',
      'Currency',
      'Category',
      'Merchant',
      'Note',
      'Source',
      'TransactionRef'
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = expenses.map(e => [
      escapeCsv(e.id),
      escapeCsv(e.date),
      escapeCsv(e.amount.toFixed(2)),
      escapeCsv(e.currency),
      escapeCsv(e.categoryName),
      escapeCsv(e.merchant || ''),
      escapeCsv(e.note || ''),
      escapeCsv(e.source),
      escapeCsv(e.transactionRef || '')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `Student_Savings_Expenses_${dateStr}.csv`;

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  }

  exportBackupJson(data: any): boolean {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `Student_Savings_Vault_Backup_${dateStr}.json`;

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  }

  async readBackupFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          if (!parsed || (typeof parsed !== 'object')) {
            reject(new Error('Fichier JSON invalide.'));
            return;
          }
          resolve(parsed);
        } catch (err) {
          reject(new Error('Impossible de lire le fichier JSON de sauvegarde.'));
        }
      };
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
      reader.readAsText(file);
    });
  }
}
