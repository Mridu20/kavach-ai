export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  employeeId: string;
  role: string;
  organization: string;
  avatarUrl?: string;
  provider: "local" | "google";
}

export interface LoginCredentials {
  identifier: string; // Email or Employee ID
  password?: string;
}

export interface SignUpFormData {
  fullName: string;
  email: string;
  employeeId: string;
  password: string;
  confirmPassword: string;
  organization?: string;
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: "Weak" | "Fair" | "Good" | "Strong";
  color: string;
  hasMinLength: boolean;
  hasNumber: boolean;
  hasUpperLower: boolean;
  hasSpecial: boolean;
}
