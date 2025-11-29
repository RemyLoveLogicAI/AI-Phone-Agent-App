import { jest } from '@jest/globals';

describe('storage helpers', () => {
  const loadModule = async () => import('../storage');

  beforeEach(async () => {
    jest.resetModules();
  });

  it('saves and retrieves call data', async () => {
    const { saveCallData, getCallData } = await loadModule();

    saveCallData('sid_1', { summary: 'Call about pricing' });
    expect(getCallData('sid_1')).toEqual({ summary: 'Call about pricing' });
  });

  it('merges updates for an existing call', async () => {
    const { saveCallData, getCallData, getAllCallData } = await loadModule();

    saveCallData('sid_2', { summary: 'First note', isSpam: false });
    saveCallData('sid_2', { isSpam: true });

    expect(getCallData('sid_2')).toEqual({ summary: 'First note', isSpam: true });
    expect(getAllCallData()).toHaveProperty('sid_2');
  });
});
