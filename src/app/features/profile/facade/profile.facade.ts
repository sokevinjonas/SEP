import { Injectable, inject } from '@angular/core';
import { ProfileState } from '../state/profile.state';
import { ProfileRepository } from '../data-access/profile.repository';
import { UserProfile } from '../domain/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileFacade {
  private readonly state = inject(ProfileState);
  private readonly repo = inject(ProfileRepository);

  readonly userProfile = this.state.userProfile;
  readonly hasCompletedOnboarding = this.state.hasCompletedOnboarding;
  readonly primaryCurrency = this.state.primaryCurrency;
  readonly studentName = this.state.studentName;
  readonly loading = this.state.loading;
  readonly error = this.state.error;

  async load(): Promise<UserProfile | null> {
    this.state.setLoading(true);
    this.state.setError(null);
    try {
      const data = await this.repo.getUserProfile();
      this.state.setUserProfile(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load user profile';
      this.state.setError(msg);
      throw err;
    } finally {
      this.state.setLoading(false);
    }
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    this.state.setLoading(true);
    try {
      await this.repo.saveUserProfile(profile);
      this.state.setUserProfile(profile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save user profile';
      this.state.setError(msg);
      throw err;
    } finally {
      this.state.setLoading(false);
    }
  }

  async updatePrimaryCurrency(currency: string): Promise<void> {
    const current = this.state.userProfile();
    if (current) {
      const updated = { ...current, primaryCurrency: currency };
      await this.saveUserProfile(updated);
    }
  }
}
