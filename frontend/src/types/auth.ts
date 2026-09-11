export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  employeeId: string;
  role: string;
  avatarUrl?: string;
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
