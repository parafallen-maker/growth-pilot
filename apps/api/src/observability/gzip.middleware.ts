import { gzipSync } from 'node:zlib';

const MIN_COMPRESSIBLE_BYTES = 1024;

type NextFunction = () => void;

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  statusCode: number;
  getHeader: (name: string) => unknown;
  setHeader: (name: string, value: string | number) => void;
  json: (body: unknown) => ResponseLike;
  send: (body: unknown) => ResponseLike;
};

function acceptsGzip(request: RequestLike) {
  const header = request.headers['accept-encoding'];
  if (typeof header !== 'string') {
    return false;
  }

  return header.toLowerCase().includes('gzip');
}

function shouldSkipCompression(response: ResponseLike, payload: Buffer) {
  if (payload.byteLength < MIN_COMPRESSIBLE_BYTES) {
    return true;
  }

  const existingEncoding = response.getHeader('content-encoding');
  return typeof existingEncoding === 'string' && existingEncoding.length > 0;
}

function toBuffer(body: unknown) {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body === 'string') {
    return Buffer.from(body);
  }

  return Buffer.from(JSON.stringify(body));
}

export function gzipCompressionMiddleware(request: RequestLike, response: ResponseLike, next: NextFunction) {
  if (!acceptsGzip(request)) {
    next();
    return;
  }

  const originalJson = response.json.bind(response);
  const originalSend = response.send.bind(response);

  const sendCompressed = (body: unknown, fallback: (value: unknown) => ResponseLike) => {
    const payload = toBuffer(body);
    if (shouldSkipCompression(response, payload) || response.statusCode === 204 || response.statusCode === 304) {
      return fallback(body);
    }

    const compressed = gzipSync(payload);
    response.setHeader('content-encoding', 'gzip');
    response.setHeader('vary', 'Accept-Encoding');
    response.setHeader('content-length', compressed.byteLength);
    return originalSend(compressed);
  };

  response.json = ((body: unknown) => {
    if (!response.getHeader('content-type')) {
      response.setHeader('content-type', 'application/json; charset=utf-8');
    }

    return sendCompressed(body, originalJson);
  }) as typeof response.json;

  response.send = ((body: unknown) => sendCompressed(body, originalSend)) as typeof response.send;

  next();
}
