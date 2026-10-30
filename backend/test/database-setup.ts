import 'reflect-metadata';
import { assertDatabaseTestEnvironment } from './database-environment.js';

assertDatabaseTestEnvironment(process.env);
