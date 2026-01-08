/**
 * Email service mock
 * Mocks email sending functionality for tests
 */

export interface MockEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface MockEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Mock email send function
 */
export const mockSendEmail = jest.fn<
  Promise<MockEmailResult>,
  [MockEmailOptions]
>().mockResolvedValue({
  success: true,
  messageId: 'mock-message-id-' + Date.now(),
});

/**
 * Mock MFA code email sender
 */
export const mockSendMfaCode = jest.fn<
  Promise<MockEmailResult>,
  [string, string]
>().mockResolvedValue({
  success: true,
  messageId: 'mock-mfa-message-id-' + Date.now(),
});

/**
 * Mock invitation email sender
 */
export const mockSendInvitation = jest.fn<
  Promise<MockEmailResult>,
  [string, string, string]
>().mockResolvedValue({
  success: true,
  messageId: 'mock-invitation-message-id-' + Date.now(),
});

/**
 * Mock reminder email sender
 */
export const mockSendReminder = jest.fn<
  Promise<MockEmailResult>,
  [string, string, number]
>().mockResolvedValue({
  success: true,
  messageId: 'mock-reminder-message-id-' + Date.now(),
});

/**
 * Mock password reset email sender
 */
export const mockSendPasswordReset = jest.fn<
  Promise<MockEmailResult>,
  [string, string]
>().mockResolvedValue({
  success: true,
  messageId: 'mock-reset-message-id-' + Date.now(),
});

/**
 * Mock verification email sender
 */
export const mockSendVerificationEmail = jest.fn<
  Promise<MockEmailResult>,
  [string, string]
>().mockResolvedValue({
  success: true,
  messageId: 'mock-verification-message-id-' + Date.now(),
});

/**
 * Complete email service mock
 */
export const mockEmailService = {
  sendEmail: mockSendEmail,
  sendMfaCode: mockSendMfaCode,
  sendInvitation: mockSendInvitation,
  sendReminder: mockSendReminder,
  sendPasswordReset: mockSendPasswordReset,
  sendVerificationEmail: mockSendVerificationEmail,
};

/**
 * Clears all email mock call history
 */
export const clearEmailMocks = (): void => {
  mockSendEmail.mockClear();
  mockSendMfaCode.mockClear();
  mockSendInvitation.mockClear();
  mockSendReminder.mockClear();
  mockSendPasswordReset.mockClear();
  mockSendVerificationEmail.mockClear();
};

/**
 * Resets all email mocks to default implementations
 */
export const resetEmailMocks = (): void => {
  mockSendEmail.mockReset().mockResolvedValue({
    success: true,
    messageId: 'mock-message-id-' + Date.now(),
  });
  mockSendMfaCode.mockReset().mockResolvedValue({
    success: true,
    messageId: 'mock-mfa-message-id-' + Date.now(),
  });
  mockSendInvitation.mockReset().mockResolvedValue({
    success: true,
    messageId: 'mock-invitation-message-id-' + Date.now(),
  });
  mockSendReminder.mockReset().mockResolvedValue({
    success: true,
    messageId: 'mock-reminder-message-id-' + Date.now(),
  });
  mockSendPasswordReset.mockReset().mockResolvedValue({
    success: true,
    messageId: 'mock-reset-message-id-' + Date.now(),
  });
  mockSendVerificationEmail.mockReset().mockResolvedValue({
    success: true,
    messageId: 'mock-verification-message-id-' + Date.now(),
  });
};

/**
 * Makes email mock fail
 */
export const makeEmailFail = (error: string = 'Email sending failed'): void => {
  mockSendEmail.mockResolvedValue({
    success: false,
    error,
  });
};

/**
 * Gets all emails sent to a specific address
 */
export const getEmailsSentTo = (email: string): MockEmailOptions[] => {
  return mockSendEmail.mock.calls
    .filter((call) => call[0].to === email)
    .map((call) => call[0]);
};

/**
 * Asserts that an email was sent
 */
export const expectEmailSent = (to: string): void => {
  const sent = mockSendEmail.mock.calls.some((call) => call[0].to === to);
  if (!sent) {
    throw new Error(`Expected email to be sent to ${to}`);
  }
};

/**
 * Asserts that no email was sent
 */
export const expectNoEmailSent = (): void => {
  if (mockSendEmail.mock.calls.length > 0) {
    throw new Error(
      `Expected no emails to be sent, but ${mockSendEmail.mock.calls.length} were sent`
    );
  }
};
