import { Router } from 'express';
import { loadAdminConfig } from '../config/admin';
import { loadAuthConfig } from '../config/auth';
import { loadMailConfig } from '../config/mail';
import { AuthTokenService } from '../src/Auth/AuthTokenService';
import { TokenService } from '../src/Auth/TokenService';
import { AdminController } from '../src/Http/Controllers/AdminController';
import { AuthController } from '../src/Http/Controllers/AuthController';
import { HealthController } from '../src/Http/Controllers/HealthController';
import { PasswordResetController } from '../src/Http/Controllers/PasswordResetController';
import { RegistrationController } from '../src/Http/Controllers/RegistrationController';
import { ServerController } from '../src/Http/Controllers/ServerController';
import { TemplateController } from '../src/Http/Controllers/TemplateController';
import { authenticate } from '../src/Http/Middleware/Authenticate';
import { requireAdmin, requireEvent } from '../src/Http/Middleware/Authorize';
import { createMailer } from '../src/Mail/createMailer';
import { AccessService } from '../src/Services/AccessService';
import { AdminService } from '../src/Services/AdminService';
import { AuthService } from '../src/Services/AuthService';
import { PasswordResetService } from '../src/Services/PasswordResetService';
import { RegistrationService } from '../src/Services/RegistrationService';
import { ServerService } from '../src/Services/ServerService';
import { TemplateService } from '../src/Services/TemplateService';

const router = Router();

const authConfig = loadAuthConfig();
const adminConfig = loadAdminConfig();
const mailConfig = loadMailConfig();
const tokens = new TokenService(authConfig.jwtSecret, authConfig.jwtExpiresInSeconds);
const mailer = createMailer(mailConfig);
const authTokens = new AuthTokenService(mailConfig.linkTtlMinutes);
const accessService = new AccessService();
const registrationService = new RegistrationService(
    accessService,
    mailer,
    mailConfig.linkBaseUrl,
    mailConfig.linkTtlMinutes
);
const passwordReset = new PasswordResetService(
    authTokens,
    mailer,
    mailConfig.linkBaseUrl,
    mailConfig.linkTtlMinutes
);
const authService = new AuthService(
    tokens,
    accessService,
    authConfig.refreshTokenTtlDays,
    authConfig.refreshReuseGraceSeconds
);
const adminService = new AdminService(accessService, adminConfig.email);
const authed = authenticate(tokens, authService);

const health = new HealthController();
const auth = new AuthController(authService);
const registration = new RegistrationController(registrationService);
const reset = new PasswordResetController(passwordReset);
const admin = new AdminController(adminService);
const servers = new ServerController(new ServerService());
const templates = new TemplateController(new TemplateService());

router.get('/', health.check);
router.post('/auth/register', registration.register);
router.post('/auth/verify-email/request', registration.resend);
router.post('/auth/verify-email', registration.verify);
router.post('/auth/login', auth.login);
router.post('/auth/refresh', auth.refresh);
router.get('/auth/me', authed, auth.me);
router.post('/auth/logout', authed, auth.logout);
router.post('/auth/forgot-password', reset.request);
router.post('/auth/reset-password', reset.reset);

router.get('/servers', servers.index);
router.post('/register', authed, requireEvent('server.create'), servers.store);
router.put('/servers/:id', authed, requireEvent('server.update'), servers.update);
router.delete('/servers/:id', authed, requireEvent('server.delete'), servers.destroy);

router.get('/templates', templates.index);
router.post('/templates', authed, requireEvent('template.create'), templates.store);
router.put('/templates/:id', authed, requireEvent('template.update'), templates.update);
router.delete('/templates/:id', authed, requireEvent('template.delete'), templates.destroy);

router.get('/admin/users', authed, requireAdmin(), admin.index);
router.get('/admin/catalog', authed, requireAdmin(), admin.catalog);
router.put('/admin/users/:id', authed, requireAdmin(), admin.updateUser);
router.put('/admin/users/:id/access', authed, requireAdmin(), admin.updateAccess);

export default router;
