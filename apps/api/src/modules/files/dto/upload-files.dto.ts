import { UploadFileDto } from './upload-file.dto';
import { strictObject, zod } from '../../../common/validation';

export class UploadFilesDto {
  static schema = strictObject({
    files: zod.array(UploadFileDto.schema).min(1).max(20),
  });

  files!: UploadFileDto[];
}
