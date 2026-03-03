import { User } from "./user"

export interface PhoneCall {
    id: number
    callSid: string
    phoneNumber: string
    code: string
    language: string
    createdAt: Date
    callStatus: string

    clientId: string
    client: User
}

/** DTO envoyé par le backend via SignalR (CallHub) */
export type CallLiveDTO = PhoneCall;