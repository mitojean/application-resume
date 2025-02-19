import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express-serve-static-core';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

// Types pour les tests
export type MockRequest = ExpressRequest;
export type MockResponse = ExpressResponse;
export type MockNextFunction = ExpressNextFunction;

// Création des mocks pour les tests
export const createMockRequest = (): MockRequest => {
  const req = {
    body: {},
    query: {} as ParsedQs,
    params: {} as ParamsDictionary,
    headers: {},
    ip: '127.0.0.1',
    get: jest.fn((name: string): string | string[] | undefined => {
      if (name === 'set-cookie') return [];
      return '';
    }),
    session: {},
    app: {
      get: jest.fn(),
      set: jest.fn(),
      enable: jest.fn(),
      enabled: jest.fn(),
      disable: jest.fn(),
      disabled: jest.fn(),
      engine: jest.fn(),
      param: jest.fn(),
      path: jest.fn(),
      render: jest.fn(),
      route: jest.fn(),
      use: jest.fn(),
      listen: jest.fn(),
      request: {},
      response: {},
      settings: {},
      engines: {},
      locals: {},
      mountpath: '/',
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn()
    },
    protocol: 'http',
    secure: false,
    path: '/',
    hostname: 'localhost',
    fresh: false,
    stale: true,
    xhr: false,
    cookies: {},
    signedCookies: {},
    method: 'GET',
    originalUrl: '/',
    baseUrl: '',
    url: '/',
    header: jest.fn(),
    accepts: jest.fn(),
    acceptsCharsets: jest.fn(),
    acceptsEncodings: jest.fn(),
    acceptsLanguages: jest.fn(),
    range: jest.fn(),
    param: jest.fn(),
    is: jest.fn()
  } as unknown as MockRequest;

  return req;
};

export const createMockResponse = (): MockResponse => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    headersSent: false,
    locals: {},
    app: {
      get: jest.fn(),
      set: jest.fn(),
      enable: jest.fn(),
      enabled: jest.fn(),
      disable: jest.fn(),
      disabled: jest.fn(),
      engine: jest.fn(),
      param: jest.fn(),
      path: jest.fn(),
      render: jest.fn(),
      route: jest.fn(),
      use: jest.fn(),
      listen: jest.fn(),
      request: {},
      response: {},
      settings: {},
      engines: {},
      locals: {},
      mountpath: '/',
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn()
    },
    getHeader: jest.fn(),
    setHeader: jest.fn(),
    removeHeader: jest.fn(),
    header: jest.fn(),
    write: jest.fn(),
    writeContinue: jest.fn(),
    writeHead: jest.fn(),
    statusCode: 200,
    statusMessage: 'OK',
    finished: false,
    sendDate: true,
    chunkedEncoding: false,
    shouldKeepAlive: true,
    useChunkedEncodingByDefault: true,
    sendfile: jest.fn(),
    download: jest.fn(),
    links: jest.fn(),
    jsonp: jest.fn(),
    redirect: jest.fn(),
    render: jest.fn(),
    vary: jest.fn(),
    format: jest.fn()
  } as unknown as MockResponse;

  return res;
};

export const createMockNext = (): MockNextFunction => jest.fn();

// Données de test communes
export const testData = {
  users: {
    valid: {
      email: 'test@example.com',
      identifiant: 'testuser',
      mot_de_passe: 'Test123!@#',
      code_pin: '123456'
    },
    admin: {
      email: 'admin@example.com',
      identifiant: 'admin',
      mot_de_passe: 'Admin123!@#',
      code_pin: '123456',
      role: 'admin'
    }
  },
  tokens: {
    valid: 'valid-token',
    expired: 'expired-token',
    invalid: 'invalid-token'
  },
  resumes: {
    article: {
      url: 'https://example.com/article',
      langue: 'fr' as const
    },
    youtube: {
      url: 'https://www.youtube.com/watch?v=test123',
      langue: 'fr' as const
    }
  }
};

// Configuration globale de Jest
jest.setTimeout(10000);

// Désactiver les logs pendant les tests
console.error = jest.fn();
console.warn = jest.fn();
// Garder console.log pour le débogage
// console.log = jest.fn();
