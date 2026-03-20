import { LoginFormErrors, LoginFormValues } from '@/features/auth/types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email.trim()) {
    errors.email = 'Informe seu e-mail.';
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = 'E-mail inválido.';
  }

  if (!values.password) {
    errors.password = 'Informe sua senha.';
  } else if (values.password.length < 6) {
    errors.password = 'A senha precisa ter ao menos 6 caracteres.';
  }

  return errors;
}

