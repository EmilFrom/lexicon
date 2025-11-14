import { parseTopicUrl } from '..';
import { FilterInput } from '../../topics';

it('latest', () => {
  const filterInput: FilterInput = {
    sort: 'LATEST',
  };
  const expectedOutput = 'latest';
  const topicUrl = parseTopicUrl(filterInput);
  expect(topicUrl).toEqual(expectedOutput);
});

it('top', () => {
  const filterInput: FilterInput = {
    sort: 'TOP',
  };
  const expectedOutput = 'top';
  const topicUrl = parseTopicUrl(filterInput);
  expect(topicUrl).toEqual(expectedOutput);
});

it('top daily', () => {
  const filterInput: FilterInput = {
    sort: 'TOP',
    topPeriod: 'DAILY',
  };
  const expectedOutput = 'top/daily';
  const topicUrl = parseTopicUrl(filterInput);
  expect(topicUrl).toEqual(expectedOutput);
});

it('top monthly', () => {
  const filterInput: FilterInput = {
    sort: 'TOP',
    topPeriod: 'MONTHLY',
  };
  const expectedOutput = 'top/monthly';
  const topicUrl = parseTopicUrl(filterInput);
  expect(topicUrl).toEqual(expectedOutput);
});

it('latest art tag', () => {
  const filterInput: FilterInput = {
    sort: 'LATEST',
    tag: 'art',
  };
  const expectedOutput = 'tag/art/l/latest';
  const topicUrl = parseTopicUrl(filterInput);
  expect(topicUrl).toEqual(expectedOutput);
});

it('latest art tag with game category', () => {
  const filterInput: FilterInput = {
    sort: 'LATEST',
    tag: 'art',
    categoryId: 2,
  };
  const expectedOutput = 'tags/c/2/art/l/latest';
  const topicUrl = parseTopicUrl(filterInput);
  expect(topicUrl).toEqual(expectedOutput);
});

it('top art tag with game category with no daily because there is tag', () => {
  const filterInput: FilterInput = {
    sort: 'TOP',
    tag: 'art',
    categoryId: 2,
    topPeriod: 'DAILY',
  };
  const expectedOutput = 'tags/c/2/art/l/top';
  const topicUrl = parseTopicUrl(filterInput);
  expect(topicUrl).toEqual(expectedOutput);
});

it('latest with game category', () => {
  const filterInput: FilterInput = {
    sort: 'LATEST',
    categoryId: 2,
  };
  const expectedOutput = 'c/2/l/latest';
  const topicUrl = parseTopicUrl(filterInput);
  expect(topicUrl).toEqual(expectedOutput);
});
