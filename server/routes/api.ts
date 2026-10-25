import { Router } from 'express';
import { HealthController } from '../src/Http/Controllers/HealthController';
import { ServerController } from '../src/Http/Controllers/ServerController';
import { TemplateController } from '../src/Http/Controllers/TemplateController';
import { ServerService } from '../src/Services/ServerService';
import { TemplateService } from '../src/Services/TemplateService';

const router = Router();

const health = new HealthController();
const servers = new ServerController(new ServerService());
const templates = new TemplateController(new TemplateService());

router.get('/', health.check);
router.get('/servers', servers.index);
router.post('/register', servers.store);
router.put('/servers/:id', servers.update);
router.delete('/servers/:id', servers.destroy);
router.get('/templates', templates.index);
router.post('/templates', templates.store);
router.put('/templates/:id', templates.update);
router.delete('/templates/:id', templates.destroy);

export default router;
