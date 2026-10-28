import type { DbSession } from '../../src/Persistence/Connection';
import { Template } from '../../src/Models/Template';
import { TemplateKey, type TemplateValues } from '../../src/Models/TemplateKey';

interface TemplateSeed {
    template_name: string;
    category: string;
    description: string;
    preview: string | null;
    values: TemplateValues;
}

const templates: TemplateSeed[] = [
    {
        template_name: 'Node',
        category: 'Node / JavaScript',
        description: 'Run a .js/.mjs/.cjs entry file directly under node.exe.',
        preview: 'node --env-file=.env index.js --port 3000',
        values: {
            script: 'index.js',
            args: ['--port', '3000'],
            interpreter: 'C:\\Program Files\\nodejs\\node.exe',
            interpreter_args: ['--env-file=.env'],
            exec_mode: 'fork',
            instances: 1,
            autorestart: true,
            windowsHide: true,
            env: { NODE_ENV: 'production', PORT: '3000' },
        },
    },
    {
        template_name: 'npm',
        category: 'Node / JavaScript',
        description: 'Run an npm script (npm run dev, npm start, ...) under PM2.',
        preview: 'npm run dev',
        values: {
            script: 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
            args: ['run', 'dev'],
            interpreter: 'C:\\Program Files\\nodejs\\node.exe',
            autorestart: true,
            windowsHide: true,
        },
    },
    {
        template_name: 'Python',
        category: 'Python',
        description: 'Run a .py entry file with a system Python.',
        preview: 'python -u app.py --port 5000',
        values: {
            script: 'app.py',
            args: ['--port', '5000'],
            interpreter: 'C:\\Python312\\python.exe',
            interpreter_args: ['-u'],
            autorestart: true,
            windowsHide: true,
        },
    },
    {
        template_name: 'Python (venv)',
        category: 'Python',
        description: 'Run a .py entry file pointing at the venv’s own python.exe.',
        preview: 'python app.py --port 5000',
        values: {
            script: 'app.py',
            args: ['--port', '5000'],
            interpreter: 'venv\\Scripts\\python.exe',
            autorestart: true,
            max_restarts: 50,
            windowsHide: true,
            watch: false,
        },
    },
    {
        template_name: 'PHP',
        category: 'PHP',
        description: 'Run PHP’s built-in web server (php -S).',
        preview: 'php -S 127.0.0.1:8080 -t public',
        values: {
            script: 'C:\\php\\php.exe',
            args: ['-S', '127.0.0.1:8080', '-t', 'public'],
            interpreter: 'none',
            autorestart: true,
            windowsHide: true,
        },
    },
    {
        template_name: 'Laravel',
        category: 'PHP',
        description: 'Run a Laravel app through the Artisan CLI (php artisan serve).',
        preview: 'php artisan serve --host=127.0.0.1 --port=8080',
        values: {
            script: 'artisan',
            args: ['serve', '--host=127.0.0.1', '--port=8080'],
            interpreter: 'C:\\php\\php.exe',
            autorestart: true,
            windowsHide: true,
        },
    },
    {
        template_name: 'Go',
        category: 'Compiled Binaries',
        description: 'Run a compiled Go binary directly.',
        preview: 'my-go-app.exe --port 5000',
        values: {
            script: 'my-go-app.exe',
            args: ['--port', '5000'],
            interpreter: 'none',
            autorestart: true,
            windowsHide: false,
        },
    },
];

export class TemplateSeeder {
    async run(session: DbSession): Promise<void> {
        if (templates.length === 0) {
            throw new Error('No templates defined — refusing to prune every template row');
        }

        for (const template of templates) {
            const templateId = await Template.upsert(
                {
                    template_name: template.template_name,
                    category: template.category,
                    description: template.description,
                    preview: template.preview,
                },
                session
            );

            if (templateId === undefined) {
                throw new Error(`Upsert of template "${template.template_name}" returned no id`);
            }

            await TemplateKey.replaceAll(templateId, template.values, session);
            console.log(`Seeded template: ${template.template_name} (ID: ${templateId})`);
        }

        await Template.deleteExcept(
            templates.map((template) => template.template_name),
            session
        );
    }
}
