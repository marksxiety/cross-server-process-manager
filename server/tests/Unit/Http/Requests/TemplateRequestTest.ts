import { describe, expect, it } from 'vitest';
import { ValidationException } from '../../../../src/Exceptions/ValidationException';
import { StoreTemplateRequest } from '../../../../src/Http/Requests/StoreTemplateRequest';
import { UpdateTemplateRequest } from '../../../../src/Http/Requests/UpdateTemplateRequest';

describe('StoreTemplateRequest', () => {
    it('trims the template name and defaults values', () => {
        const data = StoreTemplateRequest.validate({
            template_name: '  Node  ',
            category: '  ',
            values: { script: 'index.js' },
        });

        expect(data.template_name).toBe('Node');
        expect(data.category).toBe('');
        expect(data.values).toEqual({ script: 'index.js' });
    });

    it('rejects a blank key inside values', () => {
        expect(() =>
            StoreTemplateRequest.validate({ template_name: 'Node', values: { '  ': 'x' } })
        ).toThrow(ValidationException);
    });
});

describe('UpdateTemplateRequest', () => {
    it('rejects a payload without values', () => {
        expect(() => UpdateTemplateRequest.validate({})).toThrow(ValidationException);
    });

    it('accepts a values object', () => {
        expect(UpdateTemplateRequest.validate({ values: { script: 'app.py' } }).values).toEqual({
            script: 'app.py',
        });
    });
});
