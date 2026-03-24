import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ok } from '../../../common/api-response';
import { UploadFileDto } from '../dto/upload-file.dto';
import { UploadFilesDto } from '../dto/upload-files.dto';
import { FilesService } from '../service/files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  async uploadOne(@Body() payload: UploadFileDto) {
    return ok(await this.filesService.uploadOne(payload));
  }

  @Post('upload/batch')
  async uploadMany(@Body() payload: UploadFilesDto) {
    return ok(await this.filesService.uploadMany(payload.files ?? []));
  }

  @Get(':fileId')
  getFileAsset(@Param('fileId') fileId: string) {
    return ok(this.filesService.getFileAsset(fileId));
  }
}
