import { SetMetadata } from '@nestjs/common';

// Spec 023: after a temporary password the session only reaches the routes
// marked with this decorator (read or close the session, change the password).
export const allowWhilePasswordChangeKey = 'allowWhilePasswordChange';

export const AllowWhilePasswordChange = () =>
  SetMetadata(allowWhilePasswordChangeKey, true);
