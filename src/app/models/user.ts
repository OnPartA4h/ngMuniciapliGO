export interface RoleOption {
  key: string;
  label: string;
}

export interface ColBleuOption {
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
  items: User[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface UpdateUserDto {
  userId?: string | null
  firstName: string;
  lastName: string;
  phoneNumber: string;
  streetNumber: string;
  streetName: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface RequestEmailChangeDto {
  newEmail: string;
  userId?: string;
}

export interface VerifyEmailChangeDto {
  newEmail: string;
  code: string;
}