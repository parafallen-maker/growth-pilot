import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class BulkPublishGrowthReportsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  reportIds!: string[];

  @IsOptional()
  @IsString()
  publisherUserId?: string;

  @IsOptional()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsString()
  publishNote?: string;
}
