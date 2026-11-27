import dataSource from './data-source.js';
import { readBootstrapAdminInput } from './bootstrap/bootstrap-input.js';
import {
  BusinessEntity,
  BusinessKind,
} from '../../modules/identity/entities/business.entity.js';
import {
  UserEntity,
  UserRole,
} from '../../modules/identity/entities/user.entity.js';
import { PasswordHasher } from '../../modules/identity/security/password-hasher.js';

// Spec 023: creates the platform business and the first Administrator once.
// It refuses when an Administrator already exists; later support accounts
// are a separate decision.
async function bootstrapAdmin() {
  const input = readBootstrapAdminInput(process.env);
  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      if (await users.exists({ where: { role: UserRole.Admin } }))
        throw new Error(
          'Bootstrap refused because an administrator already exists.',
        );

      const businesses = manager.getRepository(BusinessEntity);
      const platform =
        (await businesses.findOne({
          where: { kind: BusinessKind.Platform },
        })) ??
        (await businesses.save(
          businesses.create({
            displayName: 'Soporte MAÑAY',
            isActive: true,
            kind: BusinessKind.Platform,
          }),
        ));
      const passwordHash = await new PasswordHasher().hash(input.password);

      await users.save(
        users.create({
          businessId: platform.id,
          isActive: true,
          passwordHash,
          role: UserRole.Admin,
          username: input.username,
        }),
      );
    });

    process.stdout.write('Platform business and administrator created.\n');
  } finally {
    await dataSource.destroy();
  }
}

await bootstrapAdmin();
