import { GoneException } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import type { ReportsService } from './reports.service.js';

it('retires the old margin endpoint without calculating a substitute or reading lot costs', () => {
  const commercialMargin = vi.fn();
  const controller = new ReportsController({
    commercialMargin,
  } as unknown as ReportsService);
  expect(() => controller.margin()).toThrow(GoneException);
  expect(commercialMargin).not.toHaveBeenCalled();
});
