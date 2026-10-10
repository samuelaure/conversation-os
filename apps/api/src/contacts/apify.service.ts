import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApifyClient } from 'apify-client';

const ACTOR_ID = 'LpVuK3Zozwuipa5bp'; // harvestapi/linkedin-profile-scraper

@Injectable()
export class ApifyService {
  private readonly client: ApifyClient;

  constructor(private readonly config: ConfigService) {
    this.client = new ApifyClient({ token: this.config.get<string>('APIFY_TOKEN') });
  }

  async scrapeLinkedInProfile(linkedinUrl: string): Promise<LinkedInProfileRaw | null> {
    const run = await this.client.actor(ACTOR_ID).call({
      profileScraperMode: "Profile details no email ($4 per 1k)",
      queries: [linkedinUrl],
    });

    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      return null;
    }

    return items[0] as unknown as LinkedInProfileRaw;
  }

  /**
   * Scrapes multiple LinkedIn profiles in a single Apify run (one actor call,
   * not one per URL — avoids per-profile run overhead for bulk CSV imports).
   * Returns a Map keyed by the input URL so callers can line results back up
   * even if the actor returns them in a different order or drops a failed one.
   */
  async scrapeLinkedInProfiles(linkedinUrls: string[]): Promise<Map<string, LinkedInProfileRaw>> {
    const run = await this.client.actor(ACTOR_ID).call({
      profileScraperMode: "Profile details no email ($4 per 1k)",
      queries: linkedinUrls,
    });

    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

    const byUrl = new Map<string, LinkedInProfileRaw>();
    for (const item of items as unknown as LinkedInProfileRaw[]) {
      if (item?.linkedinUrl) byUrl.set(item.linkedinUrl, item);
    }
    return byUrl;
  }
}

// Minimal typing based on the harvestapi output we know
export interface LinkedInProfileRaw {
  id: string;
  publicIdentifier: string;
  linkedinUrl: string;
  firstName: string;
  lastName: string;
  headline?: string;
  about?: string;
  photo?: string;
  location?: {
    linkedinText: string;
    countryCode: string;
    parsed?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };
  currentPosition?: Array<{
    position: string;
    companyName: string;
    companyLinkedinUrl?: string;
    companyId?: string;
    companyLogo?: { url: string };
  }>;
}
