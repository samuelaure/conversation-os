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
