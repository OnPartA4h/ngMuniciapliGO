import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string; width: string; height: string };
    fixed_height_small: { url: string; width: string; height: string };
    original: { url: string };
  };
}

interface GiphyResponse {
  data: GiphyGif[];
  pagination: { total_count: number; count: number; offset: number };
}

// Clé API publique Giphy (beta key, limitée à 100 req/h)
const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

@Injectable({ providedIn: 'root' })
export class GiphyService {
  private http = inject(HttpClient);

  async search(query: string, limit = 24, offset = 0): Promise<GiphyGif[]> {
    const params = new HttpParams()
      .set('api_key', GIPHY_API_KEY)
      .set('q', query)
      .set('limit', limit.toString())
      .set('offset', offset.toString())
      .set('rating', 'g')
      .set('lang', 'fr');

    const res = await lastValueFrom(
      this.http.get<GiphyResponse>(`${GIPHY_BASE}/search`, { params })
    );
    return res.data;
  }

  async trending(limit = 24): Promise<GiphyGif[]> {
    const params = new HttpParams()
      .set('api_key', GIPHY_API_KEY)
      .set('limit', limit.toString())
      .set('rating', 'g');

    const res = await lastValueFrom(
      this.http.get<GiphyResponse>(`${GIPHY_BASE}/trending`, { params })
    );
    return res.data;
  }
}
