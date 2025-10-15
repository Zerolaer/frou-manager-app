import { describe, it, expect } from 'vitest';
import {
  validateField,
  validateObject,
  sanitizeHtml,
  sanitizeForDisplay,
  VALIDATION_PATTERNS,
  SANITIZATION_FUNCTIONS,
  VALIDATION_SCHEMAS
} from '@/lib/dataValidation';

describe('Data Validation', () => {
  describe('validateField', () => {
    it('should validate required fields', () => {
      const result = validateField('', { required: true }, 'Email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email обязательно для заполнения');
    });

    it('should validate minLength', () => {
      const result = validateField('abc', { minLength: 5 }, 'Password');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('не менее 5 символов');
    });

    it('should validate maxLength', () => {
      const result = validateField('a'.repeat(201), { maxLength: 200 }, 'Title');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('не более 200 символов');
    });

    it('should validate pattern', () => {
      const result = validateField('invalid-email', {
        pattern: VALIDATION_PATTERNS.email
      }, 'Email');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('неверный формат');
    });

    it('should validate email pattern', () => {
      const validEmail = validateField('test@example.com', {
        pattern: VALIDATION_PATTERNS.email
      });
      expect(validEmail.isValid).toBe(true);

      const invalidEmail = validateField('test@', {
        pattern: VALIDATION_PATTERNS.email
      });
      expect(invalidEmail.isValid).toBe(false);
    });

    it('should validate numeric min/max', () => {
      const tooSmall = validateField(-1, { min: 0 }, 'Amount');
      expect(tooSmall.isValid).toBe(false);

      const tooLarge = validateField(101, { max: 100 }, 'Progress');
      expect(tooLarge.isValid).toBe(false);

      const valid = validateField(50, { min: 0, max: 100 }, 'Progress');
      expect(valid.isValid).toBe(true);
    });

    it('should apply sanitization', () => {
      const result = validateField('  test  ', {
        sanitize: SANITIZATION_FUNCTIONS.trim
      });
      expect(result.sanitizedValue).toBe('test');
    });

    it('should handle custom validation', () => {
      const result = validateField('test', {
        custom: (value) => value === 'forbidden' ? 'Запрещённое значение' : undefined
      });
      expect(result.isValid).toBe(true);

      const forbidden = validateField('forbidden', {
        custom: (value) => value === 'forbidden' ? 'Запрещённое значение' : undefined
      });
      expect(forbidden.isValid).toBe(false);
      expect(forbidden.errors).toContain('Запрещённое значение');
    });
  });

  describe('validateObject', () => {
    it('should validate entire object', () => {
      const data = {
        title: '',
        description: 'Valid description',
        amount: -5
      };

      const schema = {
        title: { required: true },
        description: { maxLength: 100 },
        amount: { min: 0 }
      };

      const result = validateObject(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should sanitize all fields', () => {
      const data = {
        title: '  My Title  ',
        content: '  My Content  '
      };

      const schema = {
        title: { sanitize: SANITIZATION_FUNCTIONS.trim },
        content: { sanitize: SANITIZATION_FUNCTIONS.trim }
      };

      const result = validateObject(data, schema);
      expect(result.sanitizedValue.title).toBe('My Title');
      expect(result.sanitizedValue.content).toBe('My Content');
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML characters', () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;script&gt;');
    });

    it('should escape quotes', () => {
      const input = 'Test "quotes" and \'apostrophes\'';
      const output = sanitizeHtml(input);
      expect(output).toContain('&quot;');
      expect(output).toContain('&#x27;');
    });

    it('should handle special characters', () => {
      const input = '<>&"\'/';
      const output = sanitizeHtml(input);
      expect(output).toBe('&lt;&gt;&amp;&quot;&#x27;&#x2F;');
    });
  });

  describe('sanitizeForDisplay', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("XSS")</script> World';
      const output = sanitizeForDisplay(input);
      expect(output).not.toContain('script');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("XSS")';
      const output = sanitizeForDisplay(input);
      expect(output).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert()">Click</div>';
      const output = sanitizeForDisplay(input);
      expect(output).not.toContain('onclick=');
    });
  });

  describe('VALIDATION_PATTERNS', () => {
    it('should validate email addresses', () => {
      expect(VALIDATION_PATTERNS.email.test('test@example.com')).toBe(true);
      expect(VALIDATION_PATTERNS.email.test('invalid')).toBe(false);
      expect(VALIDATION_PATTERNS.email.test('@example.com')).toBe(false);
    });

    it('should validate URLs', () => {
      expect(VALIDATION_PATTERNS.url.test('https://example.com')).toBe(true);
      expect(VALIDATION_PATTERNS.url.test('http://test.org')).toBe(true);
      expect(VALIDATION_PATTERNS.url.test('not-a-url')).toBe(false);
    });

    it('should validate decimal numbers', () => {
      expect(VALIDATION_PATTERNS.decimal.test('123.45')).toBe(true);
      expect(VALIDATION_PATTERNS.decimal.test('123')).toBe(true);
      expect(VALIDATION_PATTERNS.decimal.test('123.456')).toBe(false); // More than 2 decimals
    });

    it('should validate strong passwords', () => {
      expect(VALIDATION_PATTERNS.strongPassword.test('Password1!')).toBe(true);
      expect(VALIDATION_PATTERNS.strongPassword.test('weak')).toBe(false);
      expect(VALIDATION_PATTERNS.strongPassword.test('NoSpecial1')).toBe(false);
    });
  });

  describe('VALIDATION_SCHEMAS', () => {
    it('should validate note schema', () => {
      const validNote = {
        title: 'My Note',
        content: 'Note content'
      };

      const result = validateObject(validNote, VALIDATION_SCHEMAS.note);
      expect(result.isValid).toBe(true);
    });

    it('should validate finance entry schema', () => {
      const invalidEntry = {
        amount: -10,
        note: 'Test note'
      };

      const result = validateObject(invalidEntry, VALIDATION_SCHEMAS.financeEntry);
      expect(result.isValid).toBe(false);
    });

    it('should validate user schema', () => {
      const validUser = {
        email: 'test@example.com',
        password: 'StrongPass1!'
      };

      const result = validateObject(validUser, VALIDATION_SCHEMAS.user);
      expect(result.isValid).toBe(true);
    });
  });
});

