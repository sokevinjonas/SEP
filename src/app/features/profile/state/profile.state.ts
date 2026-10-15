import { Injectable, signal, computed } from '@angular/core';
import { UserProfile } from '../domain/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileState {
  private readonly _userProfile = signal<UserProfile | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly userProfile = this._userProfile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly hasCompletedOnboarding = computed(
    () => !!this._userProfile()?.hasCompletedOnboarding
  );

  readonly primaryCurrency = computed(
    () => this._userProfile()?.primaryCurrency || 'GHS'
  );

  readonly studentName = computed(
    () => this._userProfile()?.name || 'Student'
  );

  setUserProfile(data: UserProfile): void {
    this._userProfile.set(data);
  }

  setLoading(v: boolean): void {
    this._loading.set(v);
  }

  setError(msg: string | null): void {
    this._error.set(msg);
  }
}
