import { loadAdminConfig } from '../../config/admin';
import { hashPassword, verifyPassword } from '../Auth/PasswordHasher';
import db from '../Persistence/Connection';
import { User } from '../Models/User';

/**
 * Ensures the ENV-managed admin exists and matches the configured credentials.
 * Other admins are intentionally left untouched so admins can promote peers.
 */
export async function ensureAdminAccount(): Promise<void> {
    const config = loadAdminConfig();
    const existing = await User.findByEmail(config.email);

    if (!existing) {
        const passwordHash = await hashPassword(config.password);
        const created = await User.createVerified({
            email: config.email,
            name: config.name,
            password_hash: passwordHash,
            is_active: true,
            is_admin: true,
        });

        if (!created) {
            throw new Error('Failed to create the ENV admin account');
        }

        console.log(`Admin account created for ${config.email}`);
        return;
    }

    const passwordMatches = await verifyPassword(config.password, existing.password_hash);
    const passwordHash = passwordMatches
        ? existing.password_hash
        : await hashPassword(config.password);

    await db.query(
        `UPDATE users
         SET name = @p1,
             password_hash = @p2,
             is_admin = 1,
             is_active = 1,
             email_verified_at = COALESCE(email_verified_at, SYSDATETIME()),
             updated_at = SYSDATETIME()
         WHERE id = @p3`,
        [config.name, passwordHash, existing.id]
    );

    console.log(`Admin account ready for ${config.email}`);
}
