import type { TemplateValuesData } from '../../Models/TemplateKey';
import { validateTemplateValues } from './TemplateRequest';

export class UpdateTemplateRequest {
    static validate(body: unknown): TemplateValuesData {
        return validateTemplateValues(body);
    }
}
