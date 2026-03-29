import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BulkHomeworkErrorItemDto {
  @IsString()
  errorTaxonomyId!: string;

  @IsOptional()
  weight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class BulkTriggerHomeworkAnalysisDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  submissionIds!: string[];

  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  promptVersion?: string;
}

export class BulkApplyHomeworkReviewTagsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  submissionIds!: string[];

  @IsOptional()
  @IsString()
  reviewerTeacherId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BulkHomeworkErrorItemDto)
  finalErrorItems!: BulkHomeworkErrorItemDto[];

  @IsOptional()
  @IsString()
  finalErrorSummary?: string;

  @IsOptional()
  @IsIn(['merge', 'replace'])
  mode?: 'merge' | 'replace';
}
