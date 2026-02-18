export interface LotoParticipant {
  id: string;
  name: string;
  email: string;
  entries: number;
  registeredAt: Date;
}

/** What the server returns for the public view (no email) */
export interface LotoParticipantPublic {
  name: string;
  entries: number;
}

export interface LotoDrawResult {
  winner: LotoParticipantPublic;
  drawId: string;
  drawnAt: Date;
}

export interface LotoTimerResponse {
  secondsRemaining: number;
}

export interface RegisterLotoPayload {
  name: string;
  email: string;
  entries: number;
}
