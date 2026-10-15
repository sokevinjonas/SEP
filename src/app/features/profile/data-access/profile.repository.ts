import { Injectable, inject } from '@angular/core';
import { IdbService, defaultUserProfile } from '../../../core/db/idb.service';
import { UserProfile } from '../domain/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileRepository {
  private readonly idb = inject(IdbService);

  async getUserProfile(): Promise<UserProfile> {
    const db = await this.idb.db;
    const profile = await db.get('user_profile', 'current_user');
    if (profile) return profile;

    const fallback = defaultUserProfile();
    await db.put('user_profile', fallback);
    return fallback;
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const db = await this.idb.db;
    profile.updatedAt = new Date().toISOString();
    await db.put('user_profile', profile);
  }
}
