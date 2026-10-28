import type { TemplateData } from '../../Models/Template';
import { validateTemplate } from './TemplateRequest';

export class StoreTemplateRequest {
    static validate(body: unknown): TemplateData {
        return validateTemplate(body);
    }
}
