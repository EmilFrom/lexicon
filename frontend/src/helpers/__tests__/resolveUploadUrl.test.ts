import { resolveUploadUrl } from '../resolveUploadUrl';

jest.mock('../../constants', () => ({
  discourseHost: 'https://example.com',
}));

describe('resolveUploadUrl', () => {
  it('returns absolute upload URL', () => {
    expect(resolveUploadUrl('upload://abc123.png')).toBe(
      'https://example.com/uploads/abc123.png',
    );
  });

  it('returns original url when not upload scheme', () => {
    expect(resolveUploadUrl('https://foo.bar/image.png')).toBe(
      'https://foo.bar/image.png',
    );
  });

  it('handles empty string', () => {
    expect(resolveUploadUrl('')).toBe('');
  });
});

