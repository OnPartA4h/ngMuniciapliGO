import { Injectable, signal, computed } from '@angular/core';
import {
  LotoParticipant,
  LotoParticipantPublic,
  LotoDrawResult,
  LotoTimerResponse,
  RegisterLotoPayload,
} from '../models/loto.model';

const COOKIE_KEY = 'loto_participants';

/** ─────────────────────────────────────────────────────────────────────
 *  Simulated API service for the Loto game.
 *  All data is persisted in cookies; the "server" actions are faked here
 *  so they can be swapped for real HTTP calls later.
 * ───────────────────────────────────────────────────────────────────── */
@Injectable()
export class LotoService {

  // ── Internal state ────────────────────────────────────────────────
  private readonly _participants = signal<LotoParticipant[]>(this.loadFromCookie());

  /** Full participant list (private – used internally) */
  readonly participants = this._participants.asReadonly();

  /** Public view: only name + entries, sorted by entries desc */
  readonly publicParticipants = computed<LotoParticipantPublic[]>(() =>
    this._participants()
      .map(p => ({ name: p.name, entries: p.entries }))
      .sort((a, b) => b.entries - a.entries)
  );

  readonly totalEntries = computed(() =>
    this._participants().reduce((s, p) => s + p.entries, 0)
  );

  // ── Action: register ─────────────────────────────────────────────
  async register(payload: RegisterLotoPayload): Promise<LotoParticipant> {
    // Simulate network delay
    await this.delay(400);

    if (!payload.name.trim() || !payload.email.trim() || payload.entries < 1) {
      throw new Error('Invalid payload');
    }

    const participant: LotoParticipant = {
      id: crypto.randomUUID(),
      name:       payload.name.trim(),
      email:      payload.email.trim().toLowerCase(),
      entries:    payload.entries,
      registeredAt: new Date(),
    };

    this._participants.update(list => [...list, participant]);
    this.saveToCookie(this._participants());
    return participant;
  }

  // ── Action: get public list ───────────────────────────────────────
  async getPublicParticipants(): Promise<LotoParticipantPublic[]> {
    await this.delay(200);
    return this.publicParticipants();
  }

  // ── Action: get timer ────────────────────────────────────────────
  async getTimer(): Promise<LotoTimerResponse> {
    await this.delay(150);
    // TODO: replace with real API call
    return { secondsRemaining: 60 };
  }

  // ── Action: draw winner ───────────────────────────────────────────
  async drawWinner(): Promise<LotoDrawResult> {
    await this.delay(500);

    const participants = this._participants();
    if (participants.length === 0) throw new Error('No participants');

    // Weighted random: expand each participant by their entries count
    const pool: LotoParticipant[] = [];
    for (const p of participants) {
      for (let i = 0; i < p.entries; i++) pool.push(p);
    }

    const winner = pool[Math.floor(Math.random() * pool.length)];

    return {
      winner:  { name: winner.name, entries: winner.entries },
      drawId:  crypto.randomUUID(),
      drawnAt: new Date(),
    };
  }

  // ── Cookie helpers ────────────────────────────────────────────────
  private saveToCookie(data: LotoParticipant[]): void {
    const json    = JSON.stringify(data);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(json)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  private loadFromCookie(): LotoParticipant[] {
    try {
      const match = document.cookie
        .split('; ')
        .find(r => r.startsWith(`${COOKIE_KEY}=`));
      if (!match) return [];
      const raw = decodeURIComponent(match.split('=').slice(1).join('='));
      const arr = JSON.parse(raw) as LotoParticipant[];
      return arr.map(p => ({ ...p, registeredAt: new Date(p.registeredAt) }));
    } catch {
      return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
