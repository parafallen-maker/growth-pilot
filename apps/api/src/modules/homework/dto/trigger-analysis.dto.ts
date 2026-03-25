import { optionalBooleanValue, optionalTrimmedString, strictObject } from '../../../common/validation';

export class TriggerHomeworkAnalysisDto {
  static schema = strictObject({
    force: optionalBooleanValue(),
    provider: optionalTrimmedString(64),
    modelName: optionalTrimmedString(128),
    promptVersion: optionalTrimmedString(32),
  });

  force?: boolean;
  provider?: string;
  modelName?: string;
  promptVersion?: string;
}
