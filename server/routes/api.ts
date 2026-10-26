import { Router } from 'express';
import { loadAuthConfig } from '../config/auth';
import { TokenService } from '../src/Auth/TokenService';
import { AuthController } from '../src/Http/Controllers/AuthController';
import { HealthController } from '../src/Http/Controllers/HealthController';
import { ServerController } from '../src/Http/Controllers/ServerController';
import { TemplateController } from '../src/Http/Controllers/TemplateController';
import { authenticate } from '../src/Http/Middleware/Authenticate';
import { AuthService } from '../src/Services/AuthService';
import { ServerService } from '../src/Services/ServerService';
import { TemplateService } from '../src/Services/TemplateService';

const router = Router();

const authConfig = loadAuthConfig();
const tokens = new TokenService(authConfig.jwtSecret, authConfig.jwtExpiresInSeconds);
const authService = new AuthService(tokens);

const health = new HealthController();
const auth = new AuthController(authService);
const servers = new ServerController(new ServerService());
const templates = new TemplateController(new TemplateService());

router.get('/', health.check);
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/me', authenticate(tokens, authService), auth.me);
router.get('/servers', servers.index);
router.post('/register', servers.store);
router.put('/servers/:id', servers.update);
router.delete('/servers/:id', servers.destroy);
router.get('/templates', templates.index);
router.post('/templates', templates.store);
router.put('/templates/:id', templates.update);
router.delete('/templates/:id', templates.destroy);

export default router;
