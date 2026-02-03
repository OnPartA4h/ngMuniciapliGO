export interface RoleOption {
  key: string;
  label: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePictureUrl?: string;
  streetNumber: string;
  streetName: string;
  city: string;
  province: string;
  postalCode: string;
  roles: string[];
  mustResetPassword: boolean;
  emailConfirmed: boolean;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  streetNumber: string;
  streetName: string;
  city: string;
  province: string;
  postalCode: string;
  roles: string[];
}

export interface CreateUserResponseDto {
  user: User;
  generatedPassword: string;
}

export interface PaginatedUsersResponse {
  users: User[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalUsers: number;
  };
}

export interface UpdateProfileDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  currentPassword?: string;
  newPassword?: string;
}