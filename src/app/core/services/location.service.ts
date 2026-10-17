import { Injectable } from '@angular/core';

export interface CountryItem {
  name: string;
  code: string;
  currency: string;
  flag: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  // Curated offline-first fallback dataset for instant load and offline resilience
  private readonly fallbackCountries: CountryItem[] = [
    { name: 'Ghana', code: 'GH', currency: 'GHS', flag: '🇬🇭' },
    { name: 'Togo', code: 'TG', currency: 'XOF', flag: '🇹🇬' },
    { name: 'Benin', code: 'BJ', currency: 'XOF', flag: '🇧🇯' },
    { name: "Côte d'Ivoire", code: 'CI', currency: 'XOF', flag: '🇨🇮' },
    { name: 'Nigeria', code: 'NG', currency: 'NGN', flag: '🇳🇬' },
    { name: 'Senegal', code: 'SN', currency: 'XOF', flag: '🇸🇳' },
    { name: 'Cameroon', code: 'CM', currency: 'XAF', flag: '🇨🇲' },
    { name: 'Burkina Faso', code: 'BF', currency: 'XOF', flag: '🇧🇫' },
    { name: 'Mali', code: 'ML', currency: 'XOF', flag: '🇲🇱' },
    { name: 'Niger', code: 'NE', currency: 'XOF', flag: '🇳🇪' },
    { name: 'Guinea', code: 'GN', currency: 'GNF', flag: '🇬🇳' },
    { name: 'France', code: 'FR', currency: 'EUR', flag: '🇫🇷' },
    { name: 'United Kingdom', code: 'GB', currency: 'GBP', flag: '🇬🇧' },
    { name: 'United States', code: 'US', currency: 'USD', flag: '🇺🇸' },
    { name: 'Canada', code: 'CA', currency: 'CAD', flag: '🇨🇦' },
  ];

  private readonly fallbackCities: Record<string, string[]> = {
    'Ghana': ['Accra', 'Kumasi', 'Cape Coast', 'Legon', 'Tema', 'Tamale', 'Sunyani', 'Koforidua', 'Takoradi', 'Ho', 'Winneba'],
    'Togo': ['Lomé', 'Kara', 'Sokodé', 'Kpalimé', 'Atakpamé', 'Dapaong', 'Tsévié', 'Aného'],
    'Benin': ['Cotonou', 'Porto-Novo', 'Abomey-Calavi', 'Parakou', 'Godomey', 'Bohicon', 'Ouidah'],
    "Côte d'Ivoire": ['Abidjan', 'Yamoussoukro', 'Bouaké', 'San-Pédro', 'Daloa', 'Korhogo', 'Bassam'],
    'Nigeria': ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Enugu', 'Benin City', 'Kano', 'Abeokuta'],
    'Senegal': ['Dakar', 'Saint-Louis', 'Thiès', 'Touba', 'Ziguinchor', 'Mbour'],
    'Cameroon': ['Yaoundé', 'Douala', 'Buea', 'Bamenda', 'Dschang', 'Garoua'],
    'Burkina Faso': ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou'],
    'Mali': ['Bamako', 'Sikasso', 'Ségou'],
    'France': ['Paris', 'Lyon', 'Toulouse', 'Bordeaux', 'Lille', 'Marseille'],
    'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Edinburgh'],
    'United States': ['New York', 'Boston', 'Chicago', 'Atlanta', 'Los Angeles'],
    'Canada': ['Montreal', 'Toronto', 'Ottawa', 'Vancouver', 'Quebec City']
  };

  private readonly countryCampuses: Record<string, string[]> = {
    'Ghana': [
      'University of Ghana (Legon)',
      'KNUST (Kumasi)',
      'GIMPA (Greenhill)',
      'Ashesi University',
      'UPSA (Accra)',
      'University of Cape Coast (UCC)',
      'Accra Technical University (ATU)',
      'Lancaster University Ghana',
      'Academic City University College'
    ],
    'Togo': [
      'Université de Lomé (Campus Nord)',
      'Université de Lomé (Campus Sud)',
      'Université Catholique de l’Afrique de l’Ouest (UCAO)',
      'IAEC Lomé',
      'Université de Kara'
    ],
    'Benin': [
      "Université d'Abomey-Calavi (UAC)",
      'ESGIS Cotonou',
      'Université Nationale des Sciences et Technologies (UNSTIM)',
      'ISM Adonai Cotonou'
    ],
    "Côte d'Ivoire": [
      'Université Félix Houphouët-Boigny (Cocody)',
      'Université Nangui Abrogoua (Abobo-Adjamé)',
      'INP-HB Yamoussoukro',
      'Institut Universitaire d’Abidjan (IUA)'
    ],
    'Nigeria': [
      'University of Lagos (UNILAG)',
      'Lagos State University (LASU)',
      'University of Ibadan (UI)',
      'Covenant University',
      'Obafemi Awolowo University (OAU)'
    ],
    'Senegal': [
      'Université Cheikh Anta Diop (UCAD Dakar)',
      'Université Gaston Berger (UGB Saint-Louis)',
      'BEM Management School Dakar'
    ]
  };

  /**
   * Fetches list of countries from public API or falls back to curated offline list.
   */
  async getCountries(): Promise<CountryItem[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('https://countriesnow.space/api/v0.1/countries', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const body = await res.json();
        if (body && Array.isArray(body.data)) {
          // Map countries
          const apiCountries: CountryItem[] = body.data.map((item: any) => ({
            name: item.country,
            code: item.iso2 || '',
            currency: this.guessCurrencyForCountry(item.country),
            flag: ''
          }));

          // Ensure our key student countries are prioritized at the top
          const priorityNames = ['Ghana', 'Togo', 'Benin', "Côte d'Ivoire", 'Nigeria', 'Senegal', 'Cameroon', 'Burkina Faso'];
          const topList = this.fallbackCountries.filter(c => priorityNames.includes(c.name));
          const otherList = apiCountries.filter(c => !priorityNames.includes(c.name));
          return [...topList, ...otherList];
        }
      }
    } catch (e) {
      console.warn('LocationService: Countries API offline, using resilient fallback dataset.', e);
    }

    return this.fallbackCountries;
  }

  /**
   * Fetches cities for a selected country from external API with instant fallback.
   */
  async getCitiesForCountry(countryName: string): Promise<string[]> {
    if (!countryName) return [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://countriesnow.space/api/v0.1/countries/cities/q?country=${encodeURIComponent(countryName)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const body = await res.json();
        if (body && Array.isArray(body.data) && body.data.length > 0) {
          // De-duplicate and sort alphabetically
          const uniqueCities = Array.from(new Set(body.data as string[])).sort();
          return uniqueCities;
        }
      }
    } catch (e) {
      console.warn(`LocationService: Cities API offline for ${countryName}, using local list.`, e);
    }

    return this.fallbackCities[countryName] || ['Main Campus City', 'Downtown'];
  }

  /**
   * Returns suggested campuses for a country.
   */
  getCampusesForCountry(countryName: string): string[] {
    return this.countryCampuses[countryName] || [
      'National University (Main Campus)',
      'International Institute of Management',
      'Polytechnic Institute'
    ];
  }

  guessCurrencyForCountry(country: string): string {
    const map: Record<string, string> = {
      'Ghana': 'GHS',
      'Togo': 'XOF',
      'Benin': 'XOF',
      "Côte d'Ivoire": 'XOF',
      'Senegal': 'XOF',
      'Burkina Faso': 'XOF',
      'Mali': 'XOF',
      'Niger': 'XOF',
      'Nigeria': 'NGN',
      'Cameroon': 'XAF',
      'United States': 'USD',
      'United Kingdom': 'GBP',
      'France': 'EUR'
    };
    return map[country] || 'GHS';
  }
}
