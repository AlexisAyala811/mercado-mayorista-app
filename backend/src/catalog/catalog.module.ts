import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IdentityModule } from '../identity/identity.module.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import { PotatoVarietyEntity } from './entities/potato-variety.entity.js';
import { ProviderEntity } from './entities/provider.entity.js';
import { BuyerEntity } from './entities/buyer.entity.js';
import {CommercialCharacteristicEntity} from './entities/commercial-characteristic.entity.js';
import {CharacteristicsController} from './characteristics.controller.js';
import {CharacteristicsService} from './characteristics.service.js';

@Module({
  controllers: [CatalogController,CharacteristicsController],
  imports: [
    IdentityModule,
    TypeOrmModule.forFeature([
      ProviderEntity,
      PotatoVarietyEntity,
      BuyerEntity,
      CommercialCharacteristicEntity,
    ]),
  ],
  providers: [CatalogService,CharacteristicsService],
})
export class CatalogModule {}
