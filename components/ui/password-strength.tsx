// components/ui/password-strength.tsx
// Password strength indicator component
import * as React from 'react';
import { cn } from '../../lib/utils';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    label: 'Contains uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'Contains lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'Contains a number',
    test: (password) => /\d/.test(password),
  },
  {
    label: 'Contains special character',
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

function calculateStrength(password: string): {
  level: StrengthLevel;
  score: number;
  passedRequirements: boolean[];
} {
  const passedRequirements = PASSWORD_REQUIREMENTS.map((req) =>
    req.test(password)
  );
  const score = passedRequirements.filter(Boolean).length;

  let level: StrengthLevel;
  if (score <= 1) {
    level = 'weak';
  } else if (score <= 2) {
    level = 'fair';
  } else if (score <= 4) {
    level = 'good';
  } else {
    level = 'strong';
  }

  return { level, score, passedRequirements };
}

const strengthConfig: Record<
  StrengthLevel,
  { label: string; color: string; bgColor: string }
> = {
  weak: {
    label: 'Weak',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
  },
  fair: {
    label: 'Fair',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
  },
  good: {
    label: 'Good',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
  },
  strong: {
    label: 'Strong',
    color: 'text-green-600',
    bgColor: 'bg-green-500',
  },
};

/**
 * PasswordStrength Component
 *
 * Displays a password strength indicator with optional requirement checklist.
 *
 * @example
 * // Basic usage
 * <PasswordStrength password={password} />
 *
 * // With requirements checklist
 * <PasswordStrength password={password} showRequirements />
 */
export function PasswordStrength({
  password,
  showRequirements = false,
  className,
}: PasswordStrengthProps) {
  const { level, score, passedRequirements } = calculateStrength(password);
  const config = strengthConfig[level];
  const totalRequirements = PASSWORD_REQUIREMENTS.length;

  // Don't show anything if password is empty
  if (!password) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn('font-medium', config.color)}>{config.label}</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out rounded-full',
              config.bgColor
            )}
            style={{ width: `${(score / totalRequirements) * 100}%` }}
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={totalRequirements}
            aria-label={`Password strength: ${config.label}`}
          />
        </div>
        {/* Segmented indicator dots */}
        <div className="flex gap-1">
          {Array.from({ length: totalRequirements }, (_, index) => (
            <div
              key={index}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-200',
                index < score ? config.bgColor : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <ul className="space-y-1.5" aria-label="Password requirements">
          {PASSWORD_REQUIREMENTS.map((requirement, index) => {
            const passed = passedRequirements[index];
            return (
              <li
                key={requirement.label}
                className={cn(
                  'flex items-center gap-2 text-xs transition-colors duration-200',
                  passed ? 'text-green-600' : 'text-muted-foreground'
                )}
              >
                {passed ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{requirement.label}</span>
                <span className="sr-only">
                  {passed ? '(met)' : '(not met)'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * usePasswordStrength Hook
 *
 * Hook to get password strength information for custom implementations.
 */
export function usePasswordStrength(password: string) {
  return React.useMemo(() => {
    const { level, score, passedRequirements } = calculateStrength(password);
    const isValid = score >= 3; // At least "good" strength

    return {
      level,
      score,
      passedRequirements,
      isValid,
      config: strengthConfig[level],
      requirements: PASSWORD_REQUIREMENTS.map((req, index) => ({
        ...req,
        passed: passedRequirements[index],
      })),
    };
  }, [password]);
}

export default PasswordStrength;
