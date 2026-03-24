export class CreateRubricTemplateDto {
  campusId?: string;
  termId?: string;
  name!: string;
  stageScope?: string;
  status?: string;
  description?: string;
  dimensions!: Array<{
    code: string;
    name: string;
    weight?: number;
    scoreMin?: number;
    scoreMax?: number;
    description?: string;
    sortOrder?: number;
  }>;
}
