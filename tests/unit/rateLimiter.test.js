const rateLimiter = require('../../middlewares/rateLimiter');

let userIdCounter = 1000;

function createReq(overrides = {}) {
  userIdCounter += 1;
  return {
    user: { id: userIdCounter },
    ip: '127.0.0.1',
    baseUrl: '/api/matches',
    path: '/1/points',
    ...overrides,
  };
}

function createRes() {
  const res = {
    headers: {},
    set(key, value) { res.headers[key] = value; },
  };
  return res;
}

describe('rateLimiter', () => {
  it('allows requests within the limit', () => {
    const limiter = rateLimiter(2);
    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(next.mock.calls[1][0]).toBeUndefined();
  });

  it('returns error when limit exceeded', () => {
    const limiter = rateLimiter(2);
    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(next.mock.calls[1][0]).toBeUndefined();
    expect(next.mock.calls[2][0]).toBeDefined();
    expect(next.mock.calls[2][0].statusCode).toBe(500);
  });

  it('sets Retry-After header when limit exceeded', () => {
    const limiter = rateLimiter(1);
    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    limiter(req, res, next);
    limiter(req, res, next);

    expect(res.headers['Retry-After']).toBe('1');
  });

  it('tracks different clients independently', () => {
    const limiter = rateLimiter(1);
    const res = createRes();
    const next = jest.fn();

    const req1 = createReq();
    const req2 = createReq();

    limiter(req1, res, next);
    limiter(req2, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(next.mock.calls[1][0]).toBeUndefined();
  });

  it('tracks different endpoints independently', () => {
    const limiter = rateLimiter(1);
    const res = createRes();
    const next = jest.fn();

    const req1 = createReq({ path: '/1/points' });
    const req2 = createReq({ path: '/1/remove-points' });

    limiter(req1, res, next);
    limiter(req2, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(next.mock.calls[1][0]).toBeUndefined();
  });
});
