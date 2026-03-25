import { SetMetadata } from '@nestjs/common';

export const PERMISSION_METADATA_KEY = 'required_permission_code';
export const RequirePermission = (code: string) => SetMetadata(PERMISSION_METADATA_KEY, code);
