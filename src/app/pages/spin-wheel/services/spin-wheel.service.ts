import { Injectable, signal } from '@angular/core';
import { WheelPrize, SpinResult } from '../models/wheel-prize.model';

@Injectable({ providedIn: 'root' })
export class SpinWheelService {

  /** Prizes – fill in real values later */
  readonly prizes: WheelPrize[] = [
    { id: 1, label: 'Prize 1',   emoji: '🎁', color: '#FF6B6B', probability: 1 },
    { id: 2, label: 'Prize 2',   emoji: '🏆', color: '#FFD93D', probability: 1 },
    { id: 3, label: 'Prize 3',   emoji: '💎', color: '#6BCB77', probability: 1 },
    { id: 4, label: 'Prize 4',   emoji: '🚀', color: '#4D96FF', probability: 1 },
    { id: 5, label: 'Prize 5',   emoji: '⭐', color: '#FF922B', probability: 1 },
    { id: 6, label: 'Prize 6',   emoji: '🎉', color: '#CC5DE8', probability: 1 },
    { id: 7, label: 'Prize 7',   emoji: '🍀', color: '#20C997', probability: 1 },
    { id: 8, label: 'Prize 8',   emoji: '🔥', color: '#F06595', probability: 1 },
  ];

  private readonly _history = signal<SpinResult[]>([]);
  readonly history = this._history.asReadonly();

  /** Weighted random selection */
  pickPrize(): WheelPrize {
    const total = this.prizes.reduce((s, p) => s + p.probability, 0);
    let rand = Math.random() * total;
    for (const p of this.prizes) {
      rand -= p.probability;
      if (rand <= 0) return p;
    }
    return this.prizes[this.prizes.length - 1];
  }

  /** Given the winning prize, return the exact target angle (centre of its slice) in degrees */
  getTargetAngle(prize: WheelPrize): number {
    const sliceAngle = 360 / this.prizes.length;
    const index = this.prizes.findIndex(p => p.id === prize.id);
    // Wheel starts at 0°. Pointer is at the top (270° in standard canvas coords).
    // We'll add extra full rotations for dramatic effect.
    const extraSpins = 5 * 360;
    const sliceCenter = index * sliceAngle + sliceAngle / 2;
    // We want sliceCenter to land at the top of the wheel (pointer)
    return extraSpins + (360 - sliceCenter);
  }

  recordResult(prize: WheelPrize): void {
    this._history.update(h => [{ prize, timestamp: new Date() }, ...h].slice(0, 10));
  }
}
