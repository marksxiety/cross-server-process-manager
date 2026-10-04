import type { Client } from 'pg';

type DataType = 'string' | 'boolean' | 'number' | 'array' | 'object';

type TemplateKey = {
  key: string;
  value: string | null;
  type: DataType;
  required: boolean;
  hidden: boolean;
};

type Template = {
  template_name: string;
  category: string;
  description: string;
  preview: string | null;
  keys: TemplateKey[];
};

const templates: Template[] = [
  {
    template_name: 'Node',
    category: 'Node / JavaScript',
    description: 'Run a .js/.mjs/.cjs entry file directly under node.exe.',
    preview: 'node --env-file=.env index.js --port 3000',
    keys: [
      { key: 'script', value: 'index.js', type: 'string', required: true, hidden: false },
      { key: 'args', value: JSON.stringify(["--port", "3000"]), type: 'array', required: false, hidden: false },
      { key: 'interpreter', value: 'C:\\Program Files\\nodejs\\node.exe', type: 'string', required: true, hidden: false },
      { key: 'interpreter_args', value: JSON.stringify(["--env-file=.env"]), type: 'array', required: false, hidden: false },
      { key: 'exec_mode', value: 'fork', type: 'string', required: false, hidden: false },
      { key: 'instances', value: '1', type: 'number', required: false, hidden: false },
      { key: 'autorestart', value: 'true', type: 'boolean', required: false, hidden: false },
      { key: 'windowsHide', value: 'true', type: 'boolean', required: false, hidden: false },
      { key: 'env', value: JSON.stringify({ NODE_ENV: "production", PORT: "3000" }), type: 'object', required: false, hidden: false },
    ]
  },
  {
    template_name: 'npm',
    category: 'Node / JavaScript',
    description: 'Run an npm script (npm run dev, npm start, ...) under PM2.',
    preview: 'npm run dev',
    keys: [
      { key: 'script', value: 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js', type: 'string', required: true, hidden: false },
      { key: 'args', value: JSON.stringify(["run", "dev"]), type: 'array', required: true, hidden: false },
      { key: 'interpreter', value: 'C:\\Program Files\\nodejs\\node.exe', type: 'string', required: true, hidden: false },
      { key: 'exec_mode', value: null, type: 'string', required: false, hidden: true },
      { key: 'instances', value: null, type: 'number', required: false, hidden: true },
      { key: 'autorestart', value: 'true', type: 'boolean', required: false, hidden: false },
      { key: 'windowsHide', value: 'true', type: 'boolean', required: false, hidden: false },
    ]
  },
  {
    template_name: 'Python',
    category: 'Python',
    description: 'Run a .py entry file with a system Python.',
    preview: 'python -u app.py --port 5000',
    keys: [
      { key: 'script', value: 'app.py', type: 'string', required: true, hidden: false },
      { key: 'args', value: JSON.stringify(["--port", "5000"]), type: 'array', required: false, hidden: false },
      { key: 'interpreter', value: 'C:\\Python312\\python.exe', type: 'string', required: true, hidden: false },
      { key: 'interpreter_args', value: JSON.stringify(["-u"]), type: 'array', required: false, hidden: false },
      { key: 'exec_mode', value: null, type: 'string', required: false, hidden: true },
      { key: 'instances', value: null, type: 'number', required: false, hidden: true },
      { key: 'autorestart', value: 'true', type: 'boolean', required: false, hidden: false },
      { key: 'windowsHide', value: 'true', type: 'boolean', required: false, hidden: false },
    ]
  },
  {
    template_name: 'Python (venv)',
    category: 'Python',
    description: 'Run a .py entry file pointing at the venv’s own python.exe.',
    preview: 'python app.py --port 5000',
    keys: [
      { key: 'script', value: 'app.py', type: 'string', required: true, hidden: false },
      { key: 'args', value: JSON.stringify(["--port", "5000"]), type: 'array', required: false, hidden: false },
      { key: 'interpreter', value: 'venv\\Scripts\\python.exe', type: 'string', required: true, hidden: false },
      { key: 'exec_mode', value: null, type: 'string', required: false, hidden: true },
      { key: 'instances', value: null, type: 'number', required: false, hidden: true },
      { key: 'autorestart', value: 'true', type: 'boolean', required: false, hidden: false },
      { key: 'max_restarts', value: '50', type: 'number', required: false, hidden: false },
      { key: 'windowsHide', value: 'true', type: 'boolean', required: false, hidden: false },
      { key: 'watch', value: 'false', type: 'boolean', required: false, hidden: false },
    ]
  },
  {
    template_name: 'PHP',
    category: 'PHP',
    description: 'Run PHP’s built-in web server (php -S).',
    preview: 'php -S 127.0.0.1:8080 -t public',
    keys: [
      { key: 'script', value: 'C:\\php\\php.exe', type: 'string', required: true, hidden: false },
      { key: 'args', value: JSON.stringify(["-S", "127.0.0.1:8080", "-t", "public"]), type: 'array', required: true, hidden: false },
      { key: 'interpreter', value: 'none', type: 'string', required: true, hidden: false },
      { key: 'interpreter_args', value: null, type: 'array', required: false, hidden: true },
      { key: 'exec_mode', value: null, type: 'string', required: false, hidden: true },
      { key: 'instances', value: null, type: 'number', required: false, hidden: true },
      { key: 'autorestart', value: 'true', type: 'boolean', required: false, hidden: false },
      { key: 'windowsHide', value: 'true', type: 'boolean', required: false, hidden: false },
    ]
  },
  {
    template_name: 'Go',
    category: 'Compiled Binaries',
    description: 'Run a compiled Go binary directly.',
    preview: 'my-go-app.exe --port 5000',
    keys: [
      { key: 'script', value: 'my-go-app.exe', type: 'string', required: true, hidden: false },
      { key: 'args', value: JSON.stringify(["--port", "5000"]), type: 'array', required: false, hidden: false },
      { key: 'interpreter', value: 'none', type: 'string', required: true, hidden: false },
      { key: 'interpreter_args', value: null, type: 'array', required: false, hidden: true },
      { key: 'exec_mode', value: null, type: 'string', required: false, hidden: true },
      { key: 'instances', value: null, type: 'number', required: false, hidden: true },
      { key: 'autorestart', value: 'true', type: 'boolean', required: false, hidden: false },
      { key: 'windowsHide', value: 'true', type: 'boolean', required: false, hidden: false },
    ]
  }
];

export default async function seed(client: Client): Promise<void> {
  if (templates.length === 0) {
    throw new Error('No templates defined — refusing to prune every template row');
  }

  for (const tpl of templates) {
    const result = await client.query<{ id: number }>(
      `INSERT INTO templates (template_name, category, description, preview)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (template_name) DO UPDATE
       SET category = EXCLUDED.category,
           description = EXCLUDED.description,
           preview = EXCLUDED.preview,
           updated_at = current_timestamp
       RETURNING id`,
      [tpl.template_name, tpl.category, tpl.description, tpl.preview]
    );

    const templateId = result.rows[0]?.id;
    if (templateId === undefined) {
      throw new Error(`Upsert of template "${tpl.template_name}" returned no id`);
    }

    for (const k of tpl.keys) {
      await client.query(
        `INSERT INTO template_keys
           (template_id, property_key, property_value, data_type, is_required, is_hidden)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (template_id, property_key) DO UPDATE
         SET property_value = EXCLUDED.property_value,
             data_type = EXCLUDED.data_type,
             is_required = EXCLUDED.is_required,
             is_hidden = EXCLUDED.is_hidden,
             updated_at = current_timestamp`,
        [templateId, k.key, k.value, k.type, k.required, k.hidden]
      );
    }

    await client.query(
      `DELETE FROM template_keys
       WHERE template_id = $1 AND NOT (property_key = ANY($2::text[]))`,
      [templateId, tpl.keys.map((k) => k.key)]
    );

    console.log(`Seeded template: ${tpl.template_name} (ID: ${templateId})`);
  }

  await client.query(
    `DELETE FROM templates WHERE NOT (template_name = ANY($1::text[]))`,
    [templates.map((t) => t.template_name)]
  );
}
