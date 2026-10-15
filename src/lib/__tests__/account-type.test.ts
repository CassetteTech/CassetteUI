import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountType } from '../../types';
import { accountTypeSchema } from '../account-type';
import { isCassetteInternalAccount } from '../analytics/internal-suppression';

void test('reads the enum number or name Bridge sends', () => {
  const cases: Array<[string | number | null | undefined, AccountType | undefined]> = [
    [0, AccountType.REGULAR],
    [1, AccountType.VERIFIED],
    [2, AccountType.CASSETTE_TEAM],
    ['Regular', AccountType.REGULAR],
    ['verified', AccountType.VERIFIED],
    ['CassetteTeam', AccountType.CASSETTE_TEAM],
    ['cassette_team', AccountType.CASSETTE_TEAM],
    ['CASSETTE_TEAM', AccountType.CASSETTE_TEAM],
    [3, undefined],
    [-1, undefined],
    [1.5, undefined],
    ['admin', undefined],
    ['', undefined],
    [null, undefined],
    [undefined, undefined],
  ];
  for (const [value, expected] of cases) {
    assert.equal(accountTypeSchema.parse(value), expected, String(value));
  }
  assert.equal(accountTypeSchema.parse({ accountType: 2 }), undefined);
});

void test('rejects numeric strings and spelling variants the badge never accepted', () => {
  for (const value of ['0', '1', '2', 'cassette team', 'cassette-team', 'Cassette Team', ' Verified ']) {
    assert.equal(accountTypeSchema.parse(value), undefined, value);
  }
});

void test('a parsed account type keeps the internal-account decision of the raw value', () => {
  for (const value of [0, 1, 2, 3, 'Regular', 'Verified', 'CassetteTeam', 'cassette_team', 'CASSETTETEAM', 'admin']) {
    assert.equal(isCassetteInternalAccount(accountTypeSchema.parse(value)), isCassetteInternalAccount(value), String(value));
  }
});
