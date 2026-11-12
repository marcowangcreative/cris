export class SlotUnavailableError extends Error {
  readonly code = "unavailable";

  constructor(message: string) {
    super(message);
    this.name = "SlotUnavailableError";
  }
}

export class PricingError extends Error {
  readonly code = "pricing";

  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

export class ValidationError extends Error {
  readonly code = "validation";

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  readonly code = "not_found";

  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export type PaymentErrorCode =
  | "amount_mismatch"
  | "not_payable"
  | "invalid_signature"
  | "not_configured";

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;

  constructor(code: PaymentErrorCode, message: string) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
  }
}
