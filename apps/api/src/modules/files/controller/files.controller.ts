import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
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

  @Post('upload/multipart')
  async uploadMultipart(
    @Req() request: IncomingMessage,
    @Headers('content-type') contentType?: string,
    @Headers('x-uploaded-by') uploadedBy?: string,
    @Headers('x-upload-purpose') purpose?: string,
  ) {
    const { fileName, mimeType, content } = await this.parseMultipartRequest(request, contentType);
    return ok(
      await this.filesService.uploadMultipartFile({
        fileName,
        mimeType,
        content,
        uploadedBy,
        purpose,
      }),
    );
  }

  @Post('upload/batch')
  async uploadMany(@Body() payload: UploadFilesDto) {
    return ok(await this.filesService.uploadMany(payload.files ?? []));
  }

  @Get(':fileId')
  getFileAsset(@Param('fileId') fileId: string) {
    return ok(this.filesService.getFileAsset(fileId));
  }

  private async parseMultipartRequest(request: IncomingMessage, contentType?: string) {
    const boundary = contentType?.match(/boundary=([^;]+)/i)?.[1];
    if (!boundary) {
      throw new Error('multipart boundary is required');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks);
    const marker = Buffer.from(`--${boundary}`);
    const sections = raw
      .subarray(0, raw.length)
      .toString('binary')
      .split(marker.toString('binary'))
      .filter((section) => section.includes('Content-Disposition'));

    for (const section of sections) {
      const [rawHeaders, rawBody] = section.split('\r\n\r\n');
      if (!/name="file"/i.test(rawHeaders)) continue;
      const fileName = rawHeaders.match(/filename="([^"]+)"/i)?.[1] ?? 'upload.bin';
      const mimeType = rawHeaders.match(/Content-Type:\s*([^\r\n]+)/i)?.[1]?.trim() ?? 'application/octet-stream';
      const content = Buffer.from(rawBody.replace(/\r\n--?$/, '').replace(/\r\n$/, ''), 'binary');
      return { fileName, mimeType, content };
    }

    throw new Error('multipart file field `file` is required');
  }
}
