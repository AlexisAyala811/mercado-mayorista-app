import dataSource from './data-source.js';
import { readBootstrapWholesalerInput } from './bootstrap/bootstrap-input.js';
import { BusinessEntity } from '../identity/entities/business.entity.js';
import { UserEntity, UserRole } from '../identity/entities/user.entity.js';
import { PasswordHasher } from '../identity/security/password-hasher.js';

async function bootstrapWholesaler() {
  const input = readBootstrapWholesalerInput(process.env);
  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      if ((await users.count()) > 0) {
        throw new Error(
          'Bootstrap refused because at least one user already exists.',
        );
      }

      const business = await manager.getRepository(BusinessEntity).save(
        manager.getRepository(BusinessEntity).create({
          displayName: input.businessName,
          isActive: true,
        }),
      );
      const passwordHash = await new PasswordHasher().hash(input.password);

      await users.save(
        users.create({
          businessId: business.id,
          isActive: true,
          passwordHash,
          role: UserRole.Wholesaler,
          username: input.username,
        }),
      );
    });

    process.stdout.write('Initial business and wholesaler created.\n');
  } finally {
    await dataSource.destroy();
  }
}

await bootstrapWholesaler();
