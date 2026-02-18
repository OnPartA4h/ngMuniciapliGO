export interface WheelPrize {
  id: number;
  label: string;
  emoji: string;
  color: string;
  probability: number; // 0–1, relative weight
  value?: string;
}

export interface SpinResult {
  prize: WheelPrize;
  timestamp: Date;
}
