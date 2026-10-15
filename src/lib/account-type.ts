import { z } from 'zod';
import { AccountType } from '../types';

const accountTypeByNumber = new Map([
  [0, AccountType.REGULAR],
  [1, AccountType.VERIFIED],
  [2, AccountType.CASSETTE_TEAM],
]);

const accountTypeByName = new Map([
  ['regular', AccountType.REGULAR],
  ['verified', AccountType.VERIFIED],
  ['cassetteteam', AccountType.CASSETTE_TEAM],
  ['cassette_team', AccountType.CASSETTE_TEAM],
]);

// Bridge sends the account type as its enum number or its name, depending on the endpoint.
export const accountTypeSchema = z.union([
  z.number().transform((value) => accountTypeByNumber.get(value)),
  z.string().transform((value) => accountTypeByName.get(value.toLowerCase())),
]).nullish().catch(undefined).transform((value) => value ?? undefined);
