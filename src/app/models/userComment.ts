export interface UserComment {
    id: number
    text: string
    dateCreation: Date
    photoUrl: string
    authorFirstName: string
    authorLastName: string
    authorProfilePictureUrl: string
    isColBleu: boolean
    replies: UserComment[]
}