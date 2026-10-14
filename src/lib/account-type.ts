import { z } from 'zod';
import { AccountType } from '../types';

const accountTypeByNumber = new Map([
  [0, AccountType.REGULAR],
  [1, AccountType.VERIFIED],
  [2, AccountType.CASSETTE_TEAM],
]);

const accountTypeByName = new Map([
  ['0', AccountType.REGULAR],
  ['regular', AccountType.REGULAR],
  ['1', AccountType.VERIFIED],
  ['verified', AccountType.VERIFIED],
  ['2', AccountType.CASSETTE_TEAM],
  ['cassetteteam', AccountType.CASSETTE_TEAM],
]);

// Bridge sends the account type as its enum number or its name, depending on the endpoint.
export const accountTypeSchema = z.union([
  z.number().transform((value) => accountTypeByNumber.get(value)),
  z.string().transform((value) => accountTypeByName.get(value.toLowerCase().replace(/[^a-z0-9]/g, ''))),
]).nullish().catch(undefined).transform((value) => value ?? undefined);
