export class HomeworkErrorTaxonomyQueryDto {
  status?: 'draft' | 'active' | 'inactive';
  subject?: string;
  keyword?: string;
}

export class CreateHomeworkErrorTaxonomyDto {
  code!: string;
  name!: string;
  subject?: string;
  stageScope?: string;
  description?: string;
  status?: 'draft' | 'active' | 'inactive';
  sortOrder?: number;
}

export class UpdateHomeworkErrorTaxonomyDto {
  code?: string;
  name?: string;
  subject?: string;
  stageScope?: string;
  description?: string;
  status?: 'draft' | 'active' | 'inactive';
  sortOrder?: number;
}
