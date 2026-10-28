import { describe, expect, it } from 'vitest';
import {
    accessUpdated,
    loginFailed,
    logsCleared,
    mailFailed,
    processCommand,
    processCreated,
    serverCreated,
    serverDeleted,
    serverUpdated,
    templateCreated,
    templateDeleted,
    templateUpdated,
    userUpdated,
} from '../../../src/Audit/AuditMessages';

const SERVER = { id: 1, server: 'LOCAL', host: '10.0.0.5', port: 5638 };

describe('server messages', () => {
    it('formats create, delete and update', () => {
        expect(serverCreated(SERVER)).toBe('Registered server LOCAL (10.0.0.5:5638)');
        expect(serverDeleted(SERVER)).toBe('Deleted server LOCAL (id 1)');
        expect(
            serverUpdated(SERVER, {
                changed: ['server', 'port'],
                server: { from: 'LOCAL1', to: 'LOCAL' },
                port: { from: 5638, to: 5640 },
            })
        ).toBe('Updated server LOCAL: server LOCAL1 → LOCAL, port 5638 → 5640');
    });

    it('omits the diff suffix when nothing changed', () => {
        expect(serverUpdated(SERVER, {})).toBe('Updated server LOCAL');
    });
});

describe('process messages', () => {
    it('formats create and lifecycle commands', () => {
        expect(processCreated('web-prod', 'worker', 15)).toBe(
            'Created process worker (pm_id 15) on web-prod'
        );
        expect(processCommand('restart', 'web-prod', 'api', 12)).toBe(
            'Restarted process api (pm_id 12) on web-prod'
        );
        expect(processCommand('delete', 'web-prod', 'api', 12)).toBe(
            'Deleted process api (pm_id 12) from web-prod'
        );
        expect(processCommand('stop', 'web-prod', undefined, 12)).toBe(
            'Stopped process pm_id 12 on web-prod'
        );
    });

    it('formats cleared logs including freed bytes', () => {
        expect(logsCleared('web-prod', 'api', 12, 'all', 'active', 12288)).toBe(
            'Cleared logs for api (pm_id 12) on web-prod (stream: all, scope: active, 12 KB freed)'
        );
    });
});

describe('template messages', () => {
    const TEMPLATE = { id: 4, template_name: 'Node API' };

    it('formats create, update and delete', () => {
        expect(templateCreated(TEMPLATE)).toBe('Created template Node API (id 4)');
        expect(templateDeleted(TEMPLATE)).toBe('Deleted template Node API (id 4)');
        expect(
            templateUpdated(TEMPLATE, {
                changed: ['max_memory_restart'],
                max_memory_restart: { from: '500M', to: '750M' },
            })
        ).toBe('Updated template Node API: max_memory_restart 500M → 750M');
    });
});

describe('admin messages', () => {
    it('formats user name and email changes', () => {
        expect(
            userUpdated(
                {
                    id: 12,
                    name: 'Jane Lim',
                    email: 'jane@corp.local',
                    is_active: true,
                    is_admin: false,
                },
                {
                    id: 12,
                    name: 'Jane Lim-Co',
                    email: 'jane.lim@corp.local',
                    is_active: true,
                    is_admin: false,
                }
            )
        ).toBe(
            'Updated user Jane Lim-Co (id 12): name Jane Lim → Jane Lim-Co, email jane@corp.local → jane.lim@corp.local'
        );
    });

    it('formats access changes', () => {
        expect(
            accessUpdated(
                { id: 12, name: 'Jane Lim' },
                { pages: ['dashboard', 'server_metrics'], events: [] },
                { pages: ['dashboard', 'server_metrics', 'templates'], events: ['process.stop'] }
            )
        ).toBe(
            'Updated access for Jane Lim (id 12): pages dashboard, server_metrics → dashboard, server_metrics, templates, events none → process.stop'
        );
    });
});

describe('auth and mail messages', () => {
    it('maps known login failure reasons', () => {
        expect(loginFailed('INVALID_CREDENTIALS')).toBe('Failed sign-in (invalid credentials)');
        expect(loginFailed('ACCOUNT_DISABLED')).toBe('Failed sign-in (account disabled)');
        expect(loginFailed('SOMETHING_ELSE')).toBe('Failed sign-in (something_else)');
    });

    it('formats mail failures', () => {
        expect(mailFailed('verification')).toBe('Could not send verification email');
        expect(mailFailed('password_reset')).toBe('Could not send password reset email');
    });
});
