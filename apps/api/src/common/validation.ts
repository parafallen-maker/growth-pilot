import { ArgumentMetadata, Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import { z, type ZodRawShape, type ZodTypeAny } from 'zod';

type ZodDtoType = { schema?: ZodTypeAny };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export const zod = z;

export function strictObject<TShape extends ZodRawShape>(shape: TShape) {
  return z.object(shape).strict();
}

export function trimmedString(minLength = 1, maxLength = 255) {
  return z.string().trim().min(minLength).max(maxLength);
}

export function optionalTrimmedString(maxLength = 255) {
  return z.string().trim().min(1).max(maxLength).optional();
}

export function idString(maxLength = 64) {
  return trimmedString(1, maxLength);
}

export function optionalIdString(maxLength = 64) {
  return idString(maxLength).optional();
}

export function enumValue<TValues extends [string, ...string[]]>(values: TValues) {
  return z.enum(values);
}

export function optionalEnumValue<TValues extends [string, ...string[]]>(values: TValues) {
  return enumValue(values).optional();
}

export function integerNumber(min?: number, max?: number) {
  let schema = z.coerce.number().int();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return schema;
}

export function optionalIntegerNumber(min?: number, max?: number) {
  return integerNumber(min, max).optional();
}

export function booleanValue() {
  return z.boolean();
}

export function optionalBooleanValue() {
  return z.boolean().optional();
}

export function dateString() {
  return z.string().trim().regex(ISO_DATE_PATTERN, 'expected ISO date (YYYY-MM-DD)');
}

export function optionalDateString() {
  return dateString().optional();
}

export function dateTimeString() {
  return z.string().trim().regex(ISO_DATETIME_PATTERN, 'expected ISO datetime');
}

export function optionalDateTimeString() {
  return dateTimeString().optional();
}

export function emailString() {
  return z.string().trim().email().max(128);
}

export function optionalEmailString() {
  return emailString().optional();
}

export function mobileString() {
  return z.string().trim().regex(/^[+\d][\d\s-]{5,19}$/, 'expected phone number').max(32);
}

export function optionalMobileString() {
  return mobileString().optional();
}

export function stringArray(item = trimmedString(), min = 1, max = 100) {
  return z.array(item).min(min).max(max);
}

export function optionalStringArray(item = trimmedString(), min = 1, max = 100) {
  return stringArray(item, min, max).optional();
}

export function recordOfStrings() {
  return z.record(trimmedString(1, 128), trimmedString(1, 2048));
}

export function optionalRecordOfStrings() {
  return recordOfStrings().optional();
}

export function base64String() {
  return z.string().trim().regex(BASE64_PATTERN, 'expected base64 content');
}

export const baseListQuerySchema = strictObject({
  pageNo: integerNumber(1).optional(),
  pageSize: integerNumber(1).optional(),
  keyword: optionalTrimmedString(100),
  campusId: optionalIdString(),
  termId: optionalIdString(),
  status: optionalTrimmedString(32),
  sortBy: optionalTrimmedString(64),
  sortOrder: optionalEnumValue(['asc', 'desc']),
});

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (value === null || value === undefined || !metadata.metatype) {
      return value;
    }

    const metatype = metadata.metatype as ZodDtoType;
    if (!metatype.schema) {
      return value;
    }

    const parsed = metatype.schema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }

    throw new UnprocessableEntityException({
      code: 'DATA_422',
      message: 'validation failed',
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
}
