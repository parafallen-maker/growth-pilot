export class UpdateMessageTemplateDto {
  code?: string;
  name?: string;
  channel?: string;
  subject?: string;
  bodyTemplate?: string;
  variables?: string[];
  status?: string;
}
